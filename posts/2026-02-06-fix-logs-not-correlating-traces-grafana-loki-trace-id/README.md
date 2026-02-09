# How to Fix Logs Not Correlating with Traces in Grafana Loki Because trace_id Is Missing from Log Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana Loki, Log Correlation, Traces

Description: Fix missing trace_id in log records sent to Grafana Loki to enable log-to-trace correlation in Grafana dashboards.

You have both traces and logs flowing through the OpenTelemetry Collector to Grafana Tempo (traces) and Grafana Loki (logs). In Grafana, you expect to click on a log line and jump to the corresponding trace. But the "View Trace" button is missing because Loki logs do not contain the `trace_id` field.

## How Log-Trace Correlation Works in Grafana

Grafana can link logs to traces when log entries contain a `traceID` field (or a field configured as the trace ID in the Loki data source). When you click a log line, Grafana uses this field to query Tempo for the corresponding trace.

The chain is:
1. Application emits logs with trace context
2. OpenTelemetry Collector receives logs with `trace_id` in the log record
3. Collector exports logs to Loki, preserving the `trace_id`
4. Grafana reads `traceID` from Loki logs and links to Tempo

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

### Cause 2: Collector Does Not Preserve trace_id When Exporting to Loki

The Collector's Loki exporter needs to be configured to include trace_id as a label or structured metadata:

```yaml
exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true
    labels:
      attributes:
        service.name: "service_name"
      record:
        trace_id: "traceID"     # map trace_id to Loki label
        span_id: "spanID"
```

### Cause 3: Using OTLP to Loki but Missing Label Configuration

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

// Create a logger that automatically includes trace context
logger := otelslog.NewLogger("my-service")

func handleRequest(ctx context.Context) {
    // trace_id and span_id are automatically included
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

# trace_id and span_id are automatically added to every log record
logger.info("processing request", extra={"user_id": user_id})
```

## Fix 2: Configure the Collector Loki Exporter

```yaml
exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      attributes:
        service.name: ""
      resource:
        service.name: ""
        deployment.environment: ""
```

With the Loki exporter, trace_id from the OTLP log record is automatically mapped to Loki's structured metadata when Loki supports it.

## Fix 3: Use the Resource/Attributes Processor

If trace_id is in the log body but not in attributes, move it:

```yaml
processors:
  transform/logs:
    log_statements:
    - context: log
      statements:
      # Ensure trace_id is set as an attribute
      - set(attributes["traceID"], TraceID().String)
        where TraceID() != TraceID(0x00000000000000000000000000000000)
```

## Fix 4: Configure Grafana Loki Data Source

In Grafana, configure the Loki data source to recognize the trace ID field:

```
Settings -> Data Sources -> Loki
  -> Derived fields
    -> Name: traceID
    -> Regex: "traceID":"([a-f0-9]+)"
    -> Internal link -> Tempo
```

Or if trace_id is a label:

```
  -> Derived fields
    -> Name: TraceID
    -> Label: traceID
    -> Internal link -> Tempo
```

## Verifying Correlation

After configuration, send a test request and check:

1. In Grafana Explore, query Loki:
```
{service_name="my-service"} | json
```

2. Look for `traceID` in the parsed fields
3. Click on a log line - you should see a "View Trace" button
4. Clicking it should open the trace in Tempo

If `traceID` does not appear in the parsed fields, the trace context is not being included in the log records. Go back and check the application's logging configuration.

## Summary

Log-trace correlation requires trace_id to flow from the application through the Collector to Loki. Use OpenTelemetry log bridges to automatically inject trace context into logs. Configure the Collector's Loki exporter to preserve trace_id. Enable structured metadata in Loki. And configure Grafana's Loki data source with a derived field that links to Tempo.
