import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';
import { withSpan, getActiveTraceId } from '@/lib/telemetry';
import { fetchSigNozLogs, buildSigNozTraceUrl, type FetchLogsResult } from '@/lib/signoz-client';
import { fetchRecentDiffs, type CommitDiffResult, type GitDiffError } from '@/lib/git-diff';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOOL_ROUNDS = 3;

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'fetch_signoz_logs',
      description:
        'Query SigNoz for error/warning logs emitted around the time of the failed deployment. ' +
        'Use this first to see what actually happened at runtime before guessing at causes.',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['error', 'warn', 'info', 'all'],
            description: 'Log severity to filter on. Default to "error" unless a broader sweep is needed.',
          },
          reason: {
            type: 'string',
            description: 'One sentence on why you are querying logs right now.',
          },
        },
        required: ['severity'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_git_diff',
      description:
        'Fetch the actual code diff for the most recent commit(s) on this repository. ' +
        'Use this to check whether a recent code change plausibly caused the failure.',
      parameters: {
        type: 'object',
        properties: {
          commitCount: {
            type: 'integer',
            description: 'How many of the most recent commits to inspect (1-3).',
          },
          reason: {
            type: 'string',
            description: 'One sentence on why you are inspecting the diff right now.',
          },
        },
        required: ['commitCount'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FailureContext {
  deploymentId: string;
  workflowName: string;
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  status: string;
  conclusion: string;
  startedAtMs: number;
  finishedAtMs: number;
  recentCommits: Array<{ sha: string; message: string; author: string }>;
}

interface ToolCallLogEntry {
  tool: 'fetch_signoz_logs' | 'fetch_git_diff';
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function analyzeDeploymentFailure(deploymentId: string) {
  return withSpan('agent.init', { deploymentId }, async () => {
    const traceId = getActiveTraceId();

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        repository: true,
        workflowRuns: {
          where: { conclusion: 'failure' },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const failedRun = deployment.workflowRuns[0];

    const recentCommits = await prisma.commit.findMany({
      where: { repositoryId: deployment.repositoryId },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });

    const startedAtMs = deployment.startedAt.getTime();
    const finishedAtMs = (deployment.finishedAt ?? new Date()).getTime();

    const context: FailureContext = {
      deploymentId,
      workflowName: failedRun?.workflowName || 'GitHub Workflow',
      repositoryOwner: deployment.repository.owner,
      repositoryName: deployment.repository.name,
      branch: deployment.branch,
      status: failedRun?.status || 'completed',
      conclusion: failedRun?.conclusion || 'failure',
      startedAtMs,
      finishedAtMs,
      recentCommits: recentCommits.map((c) => ({
        sha: c.sha,
        message: c.message,
        author: c.author,
      })),
    };

    const toolCallLog: ToolCallLogEntry[] = [];
    const { summary, rootCause, recommendation } = await runAgentLoop(context, toolCallLog);

    const aiReport = await withSpan('db.upsert_ai_report', { deploymentId }, async () => {
      return prisma.aIReport.upsert({
        where: { deploymentId },
        update: {
          summary,
          rootCause,
          recommendation,
          traceId,
          toolCalls: toolCallLog as unknown as object,
          model: `groq:${MODEL}`,
        },
        create: {
          deploymentId,
          summary,
          rootCause,
          recommendation,
          traceId,
          toolCalls: toolCallLog as unknown as object,
          model: `groq:${MODEL}`,
        },
      });
    });

    return {
      ...aiReport,
      signozTraceUrl: traceId ? buildSigNozTraceUrl(traceId) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Agent tool loop
// ---------------------------------------------------------------------------

async function runAgentLoop(
  ctx: FailureContext,
  toolCallLog: ToolCallLogEntry[]
): Promise<{ summary: string; rootCause: string; recommendation: string }> {
  const systemPrompt = `You are an SRE agent diagnosing a CI/CD deployment failure for Monocular.
You have tools to pull real evidence before concluding anything:
- fetch_signoz_logs: real error/warning logs from SigNoz around the failure window
- fetch_git_diff: the actual code diff of recent commits

Call the tools you need (you may call both, in any order) before giving your final answer.
Do not fabricate log lines or diff content — only reason about what the tools return.
Once you have enough evidence (or tools return nothing useful), stop calling tools and wait
for the final synthesis instruction.`;

  const userPrompt = `Deployment failure context:
- Repository: ${ctx.repositoryOwner}/${ctx.repositoryName}
- Branch: ${ctx.branch}
- Workflow: ${ctx.workflowName}
- Status/Conclusion: ${ctx.status} / ${ctx.conclusion}
- Failure window: ${new Date(ctx.startedAtMs).toISOString()} -> ${new Date(ctx.finishedAtMs).toISOString()}
- Recent commits: ${JSON.stringify(ctx.recentCommits, null, 2)}

Investigate using your tools, then diagnose the failure.`;

  type AgentMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await withSpan(
      'agent.reasoning_step',
      { round, model: MODEL },
      async () => {
        return groq.chat.completions.create({
          model: MODEL,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
        });
      }
    );

    const choice = response.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // Model decided it has enough context; fall through to final synthesis.
      break;
    }

    messages.push(choice.message);

    for (const call of toolCalls) {
      const args = safeJsonParse(call.function.arguments);
      const result = await executeTool(call.function.name, args, ctx, toolCallLog);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  // Final synthesis: force structured JSON output using everything gathered.
  return withSpan('agent.llm_synthesis', { model: MODEL, toolCallCount: toolCallLog.length }, async () => {
    messages.push({
      role: 'user',
      content: `Based on everything gathered above, respond ONLY with JSON in this exact shape
(all values must be plain strings, no nested objects or arrays):
{
  "summary": "1-2 sentence overview of why the build failed",
  "rootCause": "Detailed technical root cause, citing specific log lines or diff hunks if you have them",
  "recommendation": "Step-by-step actionable fix as a single text string"
}`,
    });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    const parsed = safeJsonParse(rawResponse);

    return {
      summary: toSafeString(parsed.summary, 'Build failed during deployment pipeline.'),
      rootCause: toSafeString(parsed.rootCause, 'Unspecified execution error.'),
      recommendation: toSafeString(
        parsed.recommendation,
        'Check workflow run logs and the SigNoz trace linked above for the full stack trace.'
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Tool execution (each wrapped in its own span so the full call tree shows
// up in SigNoz as agent.init -> agent.reasoning_step -> agent.tool.* -> ...
// -> agent.llm_synthesis)
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: FailureContext,
  toolCallLog: ToolCallLogEntry[]
): Promise<string> {
  if (name === 'fetch_signoz_logs') {
    return withSpan(
      'agent.tool.fetch_signoz_logs',
      {
        deploymentId: ctx.deploymentId,
        severity: String(args.severity || 'error'),
      },
      async () => {
        const severity = (args.severity as FetchLogsResult['records'][number]['severity']) || 'error';
        const result = await fetchSigNozLogs({
          serviceName: process.env.SIGNOZ_SERVICE_NAME || process.env.OTEL_SERVICE_NAME,
          startMs: ctx.startedAtMs - 2 * 60 * 1000,
          endMs: ctx.finishedAtMs + 2 * 60 * 1000,
          severity: severity as 'error' | 'warn' | 'info' | 'all',
          limit: 25,
        });

        const summary = result.ok
          ? `Fetched ${result.records.length} log record(s) [${result.filterExpression || 'no filter'}]`
          : `SigNoz query failed: ${result.error}`;

        toolCallLog.push({ tool: 'fetch_signoz_logs', args, summary, ok: result.ok });

        if (!result.ok) {
          return `SigNoz log query failed: ${result.error}. Proceed using available context; do not invent log content.`;
        }
        if (result.records.length === 0) {
          return 'SigNoz returned no matching log records in the failure window. No runtime error logs were found for this filter.';
        }
        return JSON.stringify(result.records.slice(0, 15), null, 2);
      }
    );
  }

  if (name === 'fetch_git_diff') {
    return withSpan(
      'agent.tool.fetch_git_diff',
      {
        deploymentId: ctx.deploymentId,
        commitCount: Number(args.commitCount || 1),
      },
      async () => {
        const commitCount = Math.min(Math.max(Number(args.commitCount) || 1, 1), 3);
        const shas = ctx.recentCommits.map((c) => c.sha);
        const diffs = await fetchRecentDiffs(ctx.repositoryOwner, ctx.repositoryName, shas, commitCount);

        const okDiffs = diffs.filter((d): d is CommitDiffResult => !('error' in d));
        const errDiffs = diffs.filter((d): d is GitDiffError => 'error' in d);

        const summary =
          okDiffs.length > 0
            ? `Fetched diffs for ${okDiffs.length} commit(s)`
            : `Diff fetch failed for all requested commits (${errDiffs.map((e) => e.error).join('; ')})`;

        toolCallLog.push({ tool: 'fetch_git_diff', args, summary, ok: okDiffs.length > 0 });

        if (okDiffs.length === 0) {
          return `Could not fetch commit diffs: ${errDiffs.map((e) => e.error).join('; ') || 'unknown error'}. Proceed using commit messages only.`;
        }
        return JSON.stringify(okDiffs, null, 2);
      }
    );
  }

  toolCallLog.push({ tool: name as ToolCallLogEntry['tool'], args, summary: 'Unknown tool requested', ok: false });
  return `Unknown tool "${name}" — no such tool is available.`;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Groq (and any LLM prompted for "plain strings") can still occasionally
 * return an array or nested object for a field. This guarantees Prisma
 * always receives a clean string, fixing the AIReport.upsert() crash.
 */
function toSafeString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const joined = value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
    return joined.trim().length > 0 ? joined : fallback;
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.steps)) {
      return toSafeString(obj.steps, fallback);
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }
  return fallback;
}