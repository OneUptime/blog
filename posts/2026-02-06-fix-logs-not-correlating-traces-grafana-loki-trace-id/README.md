# How to Fix Logs Not Correlating with Traces in Grafana Loki Because trace_id Is

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana Loki, Log Correlation, Trace

Description: Fix missing trace_id in log records sent to Grafana Loki to enable log-to-trace correlation in Grafana dashboards.

You have both traces and logs flowing through the OpenTelemetry Collector to Grafana Tempo (traces) and Grafana Loki (logs). In Grafana, you expect to click on a log line and jump to the corresponding trace. But the "View Trace" button is missing because Loki logs do not contain the `trace_id` field.

## How Log-Trace Correlation Works in Grafana

Grafana can link logs to traces when log entries contain a trace ID field such as `trace_id` or `traceID` (or a field configured as the trace ID in the Loki data source). When you click a log line, Grafana uses this field to query Tempo for the corresponding trace.

The chain is:
1. Application emits logs with trace context
2. OpenTelemetry Collector receives logs with the trace ID in the log record
3. Collector exports logs to Loki, preserving the `trace_id`
4. Grafana reads the configured trace ID field from Loki logs and links to Tempo

If any link in this chain is broken, correlation fails.

## Common Causes of Missing trace_id

### Cause 1: Application Does Not Inject Trace Context Into Logs

The most common cause. Your application emits logs, but the logging framework is not configured to include the active trace ID.

For Go with `slog`:

```go
// BAD: log without trace context
slog.Info("processing order", "order_id", orderID)

// GOOD: extract trace context and include it
span := trace.SpanFromContext(ctx)
slog.InfoContext(ctx, "processing order",
    "order_id", orderID,
    "trace_id", span.SpanContext().TraceID().String(),
    "span_id", span.SpanContext().SpanID().String(),
)
```

A better approach is to use OpenTelemetry's log bridge, which handles this automatically.

### Cause 2: Collector Is Still Using the Old Loki Exporter Path

For Loki 3.0 and later, use Loki's native OTLP endpoint with the Collector's `otlphttp` exporter. Trace IDs are high-cardinality values, so they should be preserved as structured metadata, not promoted to Loki index labels:

```yaml
exporters:
  otlphttp/logs:
    endpoint: http://loki:3100/otlp
```

### Cause 3: Using OTLP to Loki but Structured Metadata Is Disabled

If you send logs to Loki via OTLP (Loki 3.0+), trace_id should be preserved automatically. But you need to configure Loki to accept structured metadata:

```yaml
# Loki configuration

limits_config:
  allow_structured_metadata: true

schema_config:
  configs:
  - from: "2024-01-01"
    store: tsdb
    object_store: filesystem
    schema: v13
    index:
      prefix: index_
      period: 24h
```

## Fix 1: Use OpenTelemetry Log Bridge in Your Application

### Go

```go
import (
    "go.opentelemetry.io/contrib/bridges/otelslog"
)

// Create a logger backed by the configured OpenTelemetry LoggerProvider.
logger := otelslog.NewLogger("my-service")

func handleRequest(ctx context.Context) {
    // The active trace context is carried on the OTLP log record.
    logger.InfoContext(ctx, "processing request",
        "user_id", userID)
}
```

### Python

```python
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# This patches the standard logging module to include trace context
LoggingInstrumentor().instrument(set_logging_format=True)

import logging
logger = logging.getLogger(__name__)

# otelTraceID and otelSpanID are added to the standard logging record
logger.info("processing request", extra={"user_id": user_id})
```

## Fix 2: Configure the Collector OTLP HTTP Exporter

```yaml
exporters:
  otlphttp/logs:
    endpoint: http://loki:3100/otlp

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/logs]
```

With Loki's native OTLP endpoint, `TraceId` and `SpanId` from the OTLP log record are mapped to Loki structured metadata as `trace_id` and `span_id`.

## Fix 3: Use the Transform Processor

If `trace_id` and `span_id` were parsed into log attributes but the OTLP log record fields are empty, copy them into the log record:

```yaml
processors:
  transform/logs:
    error_mode: ignore
    log_statements:
    - context: log
      statements:
      # Ensure trace_id and span_id are set on the OTLP log record
      - set(log.trace_id, TraceID(log.attributes["trace_id"]))
        where log.trace_id == TraceID(0x00000000000000000000000000000000) and log.attributes["trace_id"] != nil
      - set(log.span_id, SpanID(log.attributes["span_id"]))
        where log.span_id == SpanID(0x0000000000000000) and log.attributes["span_id"] != nil
```

## Fix 4: Configure Grafana Loki Data Source

In Grafana, configure the Loki data source to recognize the trace ID field:

```text
Settings -> Data Sources -> Loki
  -> Derived fields
    -> Name: traceID
    -> Regex: "trace_id":"([a-f0-9]+)"
    -> Internal link -> Tempo
    -> Query: ${__value.raw}
```

Or if `trace_id` is available as a label or structured metadata:

```text
  -> Derived fields
    -> Name: TraceID
    -> Type: Label
    -> Label: trace[_]?id
    -> Internal link -> Tempo
    -> Query: ${__value.raw}
```

## Verifying Correlation

After configuration, send a test request and check:

1. In Grafana Explore, query Loki:
```text
{service_name="my-service"} | json
```

2. Look for `trace_id` in the parsed fields or returned labels
3. Click on a log line - you should see a "View Trace" button
4. Clicking it should open the trace in Tempo

If `trace_id` does not appear in the parsed fields or returned labels, the trace context is not being included in the log records. Go back and check the application's logging configuration.

## Summary

Log-trace correlation requires trace_id to flow from the application through the Collector to Loki. Use OpenTelemetry log bridges to automatically inject trace context into logs. Configure the Collector's OTLP HTTP exporter to send logs to Loki's native OTLP endpoint. Enable structured metadata in Loki. And configure Grafana's Loki data source with a derived field that links to Tempo.
