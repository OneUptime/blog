# How to Troubleshoot Collector Config Validation Not Catching Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Connector, Configuration

Description: Troubleshoot OpenTelemetry Collector connector misconfigurations that pass validation but fail at runtime with unexpected behavior.

Connectors in the OpenTelemetry Collector bridge data between pipelines. For example, the `span_metrics` connector reads from a traces pipeline and outputs to a metrics pipeline. The tricky part is that connector misconfiguration often passes the `validate` command but fails silently at runtime.

## How Connectors Work

A connector acts as both an exporter (for the source pipeline) and a receiver (for the destination pipeline). This dual role makes configuration more complex:

```yaml
connectors:
  span_metrics:
    dimensions:
    - name: http.method
    - name: http.status_code

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics]   # connector as exporter
    metrics:
      receivers: [span_metrics]   # same connector as receiver
      processors: [batch]
      exporters: [prometheus_remote_write]
```

## The Problem: Validation Passes but Runtime Fails

### Issue 1: Connector Referenced Only on One Side

```yaml
connectors:
  span_metrics: {}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics]   # listed as exporter
    # BUT: no metrics pipeline uses span_metrics as a receiver
```

In some Collector versions, this passes validation because `span_metrics` is technically "used" in a pipeline. But at runtime, the connector has nowhere to send its output. The generated metrics vanish.

### Issue 2: Wrong Pipeline Type

```yaml
connectors:
  span_metrics: {}

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [span_metrics]
    traces/metrics:              # WRONG: this is a traces pipeline
      receivers: [span_metrics]   # span_metrics outputs metrics, not traces
      exporters: [otlp]
```

The `span_metrics` connector converts traces to metrics. Its output goes to a metrics pipeline, not a traces pipeline. This might validate but produce no data at runtime.

## The Fix: Correct Pipeline Wiring

```yaml
connectors:
  span_metrics:
    dimensions:
    - name: http.method
    - name: http.status_code
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 500ms, 1s, 5s]

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend, span_metrics]  # export to both backend and connector
    metrics:
      receivers: [span_metrics]                 # connector feeds into metrics pipeline
      processors: [batch]
      exporters: [prometheus_remote_write]
```

Key points:
1. The traces pipeline lists `span_metrics` as an exporter
2. A separate metrics pipeline lists `span_metrics` as a receiver
3. The traces pipeline also exports to `otlp/backend` so traces still reach your tracing backend

## Debugging Connector Data Flow

### Check If the Connector Is Receiving Data

Enable debug logging temporarily:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Look for logs from the connector component or downstream exporter:

```text
debug  connector/span_metrics  received traces  {"num_spans": 42}
debug  exporter/debug          Metrics  {"resource metrics": 1, "metrics": 2}
```

If you see traces arrive but no metrics reach the downstream exporter, the connector is processing but has nowhere to send output.

### Use the Debug Exporter

Add a debug exporter to see what the connector outputs:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write, debug]  # add debug exporter
```

The debug exporter prints every metric to the Collector's logs.

## Multiple Connectors Example

When you have multiple connectors, wiring gets complex. Here is a working example with `span_metrics` and `count`:

```yaml
connectors:
  span_metrics:
    dimensions:
    - name: service.name
    - name: http.method
  count:
    spans:
      span.count:
        description: "Number of spans"
        conditions:
        - status.code == STATUS_CODE_OK

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp, span_metrics, count]

    metrics/span_metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write]

    metrics/count:
      receivers: [count]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

Each connector gets its own destination pipeline. You can merge them into a single metrics pipeline if the exporters are the same:

```yaml
    metrics:
      receivers: [span_metrics, count]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

## Testing Connector Configuration

Write a simple test that sends a span through the Collector and verifies metrics come out:

```bash
# Send a test span using otel-cli

otel-cli span \
  --service "test-service" \
  --name "test-span" \
  --endpoint "localhost:4317" \
  --attrs "http.method=GET,http.status_code=200"

# Check if metrics are available from a Prometheus exporter
curl -s http://localhost:8889/metrics | grep "span_"
```

If the `span_metrics` connector is working and the Prometheus exporter is enabled, you should see metrics like `traces_span_metrics_duration_milliseconds_bucket`.

## Summary

Connector misconfiguration passes validation but fails at runtime because the `validate` command checks component definitions, not data flow correctness. Always verify that connectors appear as both an exporter in the source pipeline and a receiver in the destination pipeline. Use the debug exporter to confirm data flows through the connector correctly.
