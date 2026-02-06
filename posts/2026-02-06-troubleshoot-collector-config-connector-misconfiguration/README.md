# How to Troubleshoot Collector Config Validation Not Catching Connector Misconfiguration Until Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Connectors, Configuration

Description: Troubleshoot OpenTelemetry Collector connector misconfigurations that pass validation but fail at runtime with unexpected behavior.

Connectors in the OpenTelemetry Collector bridge data between pipelines. For example, the `spanmetrics` connector reads from a traces pipeline and outputs to a metrics pipeline. The tricky part is that connector misconfiguration often passes the `validate` command but fails silently at runtime.

## How Connectors Work

A connector acts as both an exporter (for the source pipeline) and a receiver (for the destination pipeline). This dual role makes configuration more complex:

```yaml
connectors:
  spanmetrics:
    dimensions:
    - name: http.method
    - name: http.status_code

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [spanmetrics]   # connector as exporter
    metrics:
      receivers: [spanmetrics]   # same connector as receiver
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## The Problem: Validation Passes but Runtime Fails

### Issue 1: Connector Referenced Only on One Side

```yaml
connectors:
  spanmetrics: {}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [spanmetrics]   # listed as exporter
    # BUT: no metrics pipeline uses spanmetrics as a receiver
```

In some Collector versions, this passes validation because `spanmetrics` is technically "used" in a pipeline. But at runtime, the connector has nowhere to send its output. The generated metrics vanish.

### Issue 2: Wrong Pipeline Type

```yaml
connectors:
  spanmetrics: {}

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics]
    traces/metrics:              # WRONG: this is a traces pipeline
      receivers: [spanmetrics]   # spanmetrics outputs metrics, not traces
      exporters: [otlp]
```

The `spanmetrics` connector converts traces to metrics. Its output goes to a metrics pipeline, not a traces pipeline. This might validate but produce no data at runtime.

## The Fix: Correct Pipeline Wiring

```yaml
connectors:
  spanmetrics:
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
      exporters: [otlp/backend, spanmetrics]  # export to both backend and connector
    metrics:
      receivers: [spanmetrics]                 # connector feeds into metrics pipeline
      processors: [batch]
      exporters: [prometheusremotewrite]
```

Key points:
1. The traces pipeline lists `spanmetrics` as an exporter
2. A separate metrics pipeline lists `spanmetrics` as a receiver
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

Look for logs from the connector component:

```
debug  connector/spanmetrics  received traces  {"num_spans": 42}
debug  connector/spanmetrics  exported metrics  {"num_metrics": 5}
```

If you see "received traces" but not "exported metrics", the connector is processing but has nowhere to send output.

### Use the Debug Exporter

Add a debug exporter to see what the connector outputs:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [spanmetrics]
      processors: [batch]
      exporters: [prometheusremotewrite, debug]  # add debug exporter
```

The debug exporter prints every metric to the Collector's logs.

## Multiple Connectors Example

When you have multiple connectors, wiring gets complex. Here is a working example with `spanmetrics` and `count`:

```yaml
connectors:
  spanmetrics:
    dimensions:
    - name: service.name
    - name: http.method
  count:
    traces:
      span.count:
        description: "Number of spans"
        conditions:
        - status.code == STATUS_CODE_OK

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp, spanmetrics, count]

    metrics/spanmetrics:
      receivers: [spanmetrics]
      processors: [batch]
      exporters: [prometheusremotewrite]

    metrics/count:
      receivers: [count]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

Each connector gets its own destination pipeline. You can merge them into a single metrics pipeline if the exporters are the same:

```yaml
    metrics:
      receivers: [spanmetrics, count]
      processors: [batch]
      exporters: [prometheusremotewrite]
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

# Check if metrics are available
curl -s http://localhost:8889/metrics | grep "span_"
```

If the spanmetrics connector is working, you should see metrics like `span_duration_milliseconds_bucket`.

## Summary

Connector misconfiguration passes validation but fails at runtime because the `validate` command checks component definitions, not data flow correctness. Always verify that connectors appear as both an exporter in the source pipeline and a receiver in the destination pipeline. Use the debug exporter to confirm data flows through the connector correctly.
