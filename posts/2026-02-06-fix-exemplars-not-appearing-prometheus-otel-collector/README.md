# How to Fix Exemplars Not Appearing in Prometheus Despite Being Received by the

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Exemplars, Metric

Description: Fix missing exemplars in Prometheus when the OpenTelemetry Collector receives them but they do not appear in query results.

Exemplars link metrics to traces. When you record a histogram measurement, you can attach the current trace ID as an exemplar. This lets you click on a metric data point in Grafana and jump directly to the trace that produced it. But getting exemplars to flow from the SDK through the Collector to Prometheus requires multiple pieces to be configured correctly.

## How Exemplars Flow

```text
SDK records metric with exemplar (trace_id, span_id)
  -> OTLP to Collector
  -> Collector exports to Prometheus (remote write or OpenMetrics scrape)
  -> Prometheus stores exemplar
  -> Grafana queries exemplar and links to Tempo
```

If any step drops the exemplar, it disappears.

## Step 1: Verify the SDK Sends Exemplars

The OpenTelemetry SDK samples exemplars from histogram measurements when exemplar sampling is enabled and the measurement context contains a sampled active span. Verify by checking the OTLP export:

```go
// Go: measurements are eligible for exemplars when
// a sampled span context is in the context
func recordLatency(ctx context.Context, duration time.Duration) {
    // This can include an exemplar with trace and span IDs
    // because ctx contains a sampled active span
    histogram.Record(ctx, duration.Seconds())
}
```

Enable debug logging on the exporter to verify exemplars are present:

```go
// Check with a console exporter temporarily
import "go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"

exporter, _ := stdoutmetric.New()
```

The console output should include exemplar data with trace and span IDs.

## Step 2: Check the Collector Passes Exemplars Through

The Collector's batch processor preserves exemplars by default. But some processors might strip them. Check your pipeline:

```yaml
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # these preserve exemplars
      exporters: [prometheus_remote_write]
```

Add the debug exporter to verify:

```yaml
exporters:
  debug:
    verbosity: detailed
  prometheus_remote_write:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus_remote_write, debug]
```

Check the Collector logs for exemplar data in the debug output.

## Step 3: Verify Prometheus Is Configured for Exemplars

Prometheus must have exemplar storage enabled. This is not on by default:

```yaml
# prometheus.yml

global:
  scrape_interval: 15s

storage:
  exemplars:
    max_exemplars: 100000

# Enable exemplar storage via command-line flag
# --enable-feature=exemplar-storage
```

Start Prometheus with the feature flag:

```bash
prometheus --config.file=prometheus.yml \
  --enable-feature=exemplar-storage
```

In Kubernetes:

```yaml
containers:
- name: prometheus
  image: prom/prometheus:v2.53.0
  args:
  - "--config.file=/etc/prometheus/prometheus.yml"
  - "--enable-feature=exemplar-storage"
```

## Step 4: Use Prometheus Remote Write or OpenMetrics Scrape for Exemplars

If you use the `prometheus` exporter (scrape model), Prometheus must negotiate OpenMetrics because exemplars are not supported in the legacy Prometheus text format. If that path does not preserve exemplars in your Collector version, use `prometheus_remote_write` instead:

```yaml
exporters:
  prometheus_remote_write:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true
```

Prometheus must have remote write receiver enabled:

```bash
prometheus --web.enable-remote-write-receiver \
  --enable-feature=exemplar-storage
```

## Step 5: Configure Grafana to Show Exemplars

In Grafana, exemplars are displayed as markers on graph panels. Configure the panel:

1. Open the panel editor
2. In the query options, enable "Exemplars"
3. Make sure the data source is configured with a Tempo link

In the Prometheus data source settings:

```text
Settings -> Data Sources -> Prometheus
  -> Exemplars
    -> Internal link: Tempo
    -> Label name: traceID
    -> URL label: traceID
```

## Step 6: Query Exemplars via API

Verify exemplars are stored in Prometheus:

```bash
# Query exemplars for a specific metric
curl -s "http://prometheus:9090/api/v1/query_exemplars?query=http_request_duration_seconds_bucket&start=2024-01-01T00:00:00Z&end=2024-12-31T00:00:00Z" | jq .
```

If the response has an empty `data` array, exemplars are not being stored.

## Common Pitfalls

### Pitfall 1: Aggregation Drops Exemplars

PromQL aggregation functions drop exemplars. If your dashboard query uses `sum()` or `avg()`, exemplars are lost at query time:

```text
# This drops exemplars
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)

# This preserves exemplars (no aggregation across series)
rate(http_request_duration_seconds_bucket{instance="app-1:8080"}[5m])
```

### Pitfall 2: Exemplar Storage Is Full

Prometheus has a fixed-size exemplar storage. When it fills up, old exemplars are evicted:

```yaml
# Increase the limit in prometheus.yml
storage:
  exemplars:
    max_exemplars: 500000
```

### Pitfall 3: Wrong Exemplar Label Name

Grafana's exemplar link must match the label name stored in Prometheus. If Grafana is configured for `traceID` but your OpenTelemetry/Prometheus pipeline exposes `trace_id`, update the data source exemplar configuration to use the actual label name.

## Summary

Getting exemplars to work requires: SDK samples exemplars from measurements with a sampled active span, Collector preserves and exports them (use `prometheus_remote_write` or OpenMetrics scrape), Prometheus has exemplar storage enabled (feature flag), and Grafana is configured to display them. Test each step independently to find where exemplars are being lost.
