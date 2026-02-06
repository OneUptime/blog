# How to Configure the OpenTelemetry Collector to Export to Last9 with SpanConnector for Metrics Derivation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Last9, SpanConnector, Metrics Derivation

Description: Set up the OpenTelemetry Collector with the SpanConnector to derive RED metrics from traces before exporting to Last9.

While Last9 can derive metrics from traces on the server side, there are situations where you want to compute span-based metrics in the Collector itself. Maybe you need those metrics available to multiple backends, or you want to apply custom dimensions that Last9 does not automatically extract. The SpanConnector (also called the spanmetrics connector) in the OpenTelemetry Collector bridges the traces pipeline to the metrics pipeline, generating RED metrics from spans before they leave the Collector.

## What the SpanConnector Does

The SpanConnector sits between your traces pipeline and metrics pipeline. It receives span data, computes latency histograms, call counts, and error counts, then emits those as metrics. These derived metrics flow through the metrics pipeline and get exported alongside your application metrics.

## Full Collector Configuration

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

connectors:
  # The spanmetrics connector bridges traces to metrics
  spanmetrics:
    # Define which span attributes become metric dimensions
    dimensions:
      - name: http.method
      - name: http.status_code
      - name: http.route
      - name: rpc.method
      - name: rpc.service
    # Configure histogram buckets for latency metrics
    histogram:
      explicit:
        buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    # Include exemplars to link metrics back to traces
    exemplars:
      enabled: true
    # Metric namespace prefix
    namespace: span.metrics

processors:
  batch/traces:
    send_batch_size: 512
    timeout: 5s

  batch/metrics:
    send_batch_size: 1024
    timeout: 10s

  resource:
    attributes:
      - key: service.name
        value: "api-gateway"
        action: upsert

exporters:
  # Export traces to Last9
  otlp/last9_traces:
    endpoint: otlp.last9.io:443
    headers:
      Authorization: "Basic ${LAST9_AUTH_TOKEN}"
    tls:
      insecure: false

  # Export metrics (including derived span metrics) to Last9
  otlp/last9_metrics:
    endpoint: otlp.last9.io:443
    headers:
      Authorization: "Basic ${LAST9_AUTH_TOKEN}"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch/traces]
      # The spanmetrics connector acts as an exporter in the traces pipeline
      exporters: [otlp/last9_traces, spanmetrics]

    metrics:
      # The spanmetrics connector acts as a receiver in the metrics pipeline
      receivers: [otlp, spanmetrics]
      processors: [batch/metrics]
      exporters: [otlp/last9_metrics]
```

## How the SpanConnector Bridges Pipelines

The key insight is that `spanmetrics` appears in two places:

1. As an **exporter** in the traces pipeline - it receives span data
2. As a **receiver** in the metrics pipeline - it emits derived metrics

```yaml
# In the traces pipeline, spanmetrics is an exporter
traces:
  exporters: [otlp/last9_traces, spanmetrics]

# In the metrics pipeline, spanmetrics is a receiver
metrics:
  receivers: [otlp, spanmetrics]
```

This dual role is what makes connectors powerful. The span data flows into the connector, gets transformed into metrics, and those metrics join the regular metrics pipeline.

## Choosing Dimensions

The `dimensions` field controls which span attributes become metric labels:

```yaml
connectors:
  spanmetrics:
    dimensions:
      - name: http.method
      - name: http.status_code
      - name: http.route
      # You can set a default value for missing attributes
      - name: db.system
        default: "unknown"
```

Be careful with high-cardinality attributes. Adding something like `user.id` as a dimension would create a metric time series per user, which can overwhelm your metrics backend. Stick to attributes with bounded cardinality like HTTP methods, status codes, and route templates.

## Custom Histogram Buckets

The default histogram buckets may not fit your latency profile. If your service typically responds in under 10ms, the default buckets waste resolution in the high end. Customize them:

```yaml
connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [1ms, 2ms, 5ms, 10ms, 20ms, 50ms, 100ms, 500ms]
```

Alternatively, use exponential histograms for automatic bucket boundaries:

```yaml
connectors:
  spanmetrics:
    histogram:
      exponential:
        max_size: 160
```

Exponential histograms adapt to your data distribution and are supported by Last9.

## Metrics Produced by the Connector

The spanmetrics connector generates these metrics:

- `span.metrics.duration` - A histogram of span durations
- `span.metrics.calls` - A counter of total span count, broken down by status

Each metric includes the configured dimensions plus `service.name`, `span.name`, `span.kind`, and `status.code` as default labels.

## Verifying the Derived Metrics

Check that the connector is producing metrics by querying the Collector's internal metrics:

```bash
# Check the Collector's own metrics endpoint
curl -s http://localhost:8888/metrics | grep spanmetrics

# Look for connector-related counters
# otelcol_connector_accepted_spans{connector="spanmetrics"} 5432
# otelcol_connector_emitted_metric_points{connector="spanmetrics"} 1289
```

In Last9, query for `span.metrics.duration` to see the derived latency histograms. You can build p50, p95, and p99 latency dashboards from these histogram metrics.

## When to Use Collector-Side vs Server-Side Derivation

Use the SpanConnector when you need derived metrics available to multiple backends (not just Last9), when you want custom dimensions that the server-side derivation does not support, or when you need to apply Collector-level processing to the derived metrics before export.

Use Last9's native TraceMetrics when you want a simpler Collector config and the default dimensions meet your needs. Both approaches work well, and you can even use both simultaneously without conflict.
