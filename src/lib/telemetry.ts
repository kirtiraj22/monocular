import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, context, type Tracer, type Span } from '@opentelemetry/api';

const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'monocular-app';

const traceExporter = new OTLPTraceExporter({
  url: OTLP_ENDPOINT,
});

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

export const tracer: Tracer = trace.getTracer(SERVICE_NAME);

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error: unknown) {
      span.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getActiveTraceId(): string | null {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  const spanContext = span.spanContext();
  if (!spanContext || spanContext.traceId === '00000000000000000000000000000000') {
    return null;
  }
  return spanContext.traceId;
}