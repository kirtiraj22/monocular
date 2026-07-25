export interface SigNozLogRecord {
  timestamp: string;
  severity: string;
  body: string;
  attributes: Record<string, unknown>;
}

export interface FetchLogsParams {
  /** OTel service.name to scope the query to, e.g. "monocular-app" */
  serviceName?: string;
  startMs: number;
  endMs: number;
  severity?: 'error' | 'warn' | 'info' | 'all';
  limit?: number;
  /** Extra ClickHouse-ish filter expression ANDed onto the query */
  extraFilter?: string;
}

export interface FetchLogsResult {
  records: SigNozLogRecord[];
  queryUrl: string;
  filterExpression: string;
  ok: boolean;
  error?: string;
  raw?: unknown;
}

function signozBaseUrl(): string {
  return (process.env.SIGNOZ_API_URL || 'http://localhost:8080').replace(/\/$/, '');
}

function parseRows(json: unknown): SigNozLogRecord[] {
  const data = (json as { data?: { result?: unknown[] } })?.data;
  const result = data?.result?.[0] as
    | { list?: unknown[]; rows?: unknown[] }
    | undefined;

  const rows = result?.list ?? result?.rows ?? [];
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const r = row as {
      timestamp?: string;
      data?: {
        timestamp?: string;
        severity_text?: string;
        severity?: string;
        body?: string;
        message?: string;
        attributes?: Record<string, unknown>;
      };
    };
    const d = r.data || {};
    return {
      timestamp: r.timestamp || d.timestamp || '',
      severity: d.severity_text || d.severity || 'unknown',
      body: d.body || d.message || JSON.stringify(d).slice(0, 500),
      attributes: d.attributes || {},
    };
  });
}

export async function fetchSigNozLogs(params: FetchLogsParams): Promise<FetchLogsResult> {
  const { serviceName, startMs, endMs, severity = 'error', limit = 50, extraFilter } = params;

  const clauses: string[] = [];
  if (serviceName) clauses.push(`service.name = '${serviceName}'`);
  if (severity !== 'all') clauses.push(`severity_text = '${severity}'`);
  if (extraFilter) clauses.push(extraFilter);
  const filterExpression = clauses.join(' AND ');

  const endpoint = `${signozBaseUrl()}/api/v5/query_range`;

  const body = {
    start: startMs,
    end: endMs,
    requestType: 'raw',
    compositeQuery: {
      queries: [
        {
          type: 'builder_query',
          spec: {
            name: 'A',
            signal: 'logs',
            ...(filterExpression ? { filter: { expression: filterExpression } } : {}),
            order: [
              { key: { name: 'timestamp' }, direction: 'desc' },
              { key: { name: 'id' }, direction: 'desc' },
            ],
            offset: 0,
            limit,
          },
        },
      ],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  // Construct headers safely — NEVER send empty or whitespace key headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.SIGNOZ_API_KEY?.trim();
  if (apiKey && apiKey !== '' && apiKey !== 'null' && apiKey !== 'undefined') {
    headers['SIGNOZ-API-KEY'] = apiKey;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        records: [],
        queryUrl: endpoint,
        filterExpression,
        ok: false,
        error: `SigNoz responded ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    const json = await res.json();
    return {
      records: parseRows(json),
      queryUrl: endpoint,
      filterExpression,
      ok: true,
      raw: json,
    };
  } catch (err) {
    return {
      records: [],
      queryUrl: endpoint,
      filterExpression,
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error querying SigNoz',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildSigNozTraceUrl(traceId: string): string {
  return `${signozBaseUrl()}/trace/${traceId}`;
}

export function buildSigNozLogsExplorerUrl(startMs: number, endMs: number): string {
  return `${signozBaseUrl()}/logs/logs-explorer?startTime=${startMs}&endTime=${endMs}`;
}