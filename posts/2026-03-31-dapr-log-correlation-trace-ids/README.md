# How to Implement Log Correlation with Trace IDs in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Tracing, Correlation, Observability

Description: Correlate Dapr distributed traces with application logs by injecting trace IDs and span IDs into structured log entries across all microservices.

---

## Why Correlate Logs with Traces?

When investigating an incident, you need to jump from a slow trace in Jaeger directly to the application logs for that exact request. Log-trace correlation links log lines to traces via the same trace ID, eliminating manual searching.

## How Dapr Propagates Trace Context

Dapr propagates W3C trace context headers (`traceparent`, `tracestate`) between services. Your application receives the active trace context on every incoming request.

## Log Correlation in Python (structlog + OpenTelemetry)

```python
import structlog
from opentelemetry import trace
from opentelemetry.trace import format_span_id, format_trace_id

def add_trace_context(logger, method, event_dict):
    """structlog processor to inject trace context into every log entry."""
    span = trace.get_current_span()
    if span.is_recording():
        ctx = span.get_span_context()
        event_dict["trace_id"] = format_trace_id(ctx.trace_id)
        event_dict["span_id"] = format_span_id(ctx.span_id)
        event_dict["trace_sampled"] = ctx.trace_flags.sampled
    return event_dict

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        add_trace_context,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)

log = structlog.get_logger()

async def process_order(order_id: str):
    log.info("processing order", order_id=order_id, step="start")
    # All logs in this call include trace_id and span_id
    result = await db.get_order(order_id)
    log.info("order loaded", order_id=order_id, status=result["status"])
    return result
```

## Log Correlation in Go (zap + OpenTelemetry)

```go
package logging

import (
    "context"

    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func TraceFields(ctx context.Context) []zap.Field {
    span := trace.SpanFromContext(ctx)
    if !span.IsRecording() {
        return nil
    }
    sctx := span.SpanContext()
    return []zap.Field{
        zap.String("trace_id", sctx.TraceID().String()),
        zap.String("span_id", sctx.SpanID().String()),
        zap.Bool("trace_sampled", sctx.IsSampled()),
    }
}

func LogWithTrace(ctx context.Context, logger *zap.Logger, msg string, fields ...zap.Field) {
    allFields := append(TraceFields(ctx), fields...)
    logger.Info(msg, allFields...)
}
```

```go
func handlePayment(ctx context.Context, w http.ResponseWriter, r *http.Request) {
    LogWithTrace(ctx, logger, "processing payment",
        zap.String("payment_id", r.URL.Query().Get("id")),
        zap.String("customer_id", r.Header.Get("X-Customer-ID")),
    )
}
```

## Structured Log Output

```json
{
  "timestamp": "2026-03-31T10:00:00.123Z",
  "level": "info",
  "message": "processing order",
  "service": "order-service",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_sampled": true,
  "order_id": "ord-001",
  "step": "start"
}
```

## Linking Logs to Traces in Grafana

Configure Grafana to link log lines to Tempo traces:

```yaml
# Grafana datasource config for Loki with trace linking
datasources:
  - name: Loki
    type: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"trace_id":"(\w+)"'
          name: TraceID
          url: '$${__value.raw}'
```

## Dapr Sidecar Log Correlation

Dapr's own sidecar logs include the trace ID automatically:

```bash
# View Dapr sidecar logs with trace context
kubectl logs -n default pod/order-service-xxx -c daprd | grep "trace_id"
```

## Summary

Log-trace correlation requires injecting the OpenTelemetry trace ID and span ID into every structured log entry. Since Dapr propagates W3C trace context automatically, your application just needs to read the active span from the OpenTelemetry context. With Grafana linking Loki log lines to Tempo traces via trace ID, you can navigate from a log entry to the full distributed trace in one click.
