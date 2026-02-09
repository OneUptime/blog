# How to Fix Exemplars Not Appearing in Prometheus Despite Being Received by the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Exemplars, Metrics

Description: Fix missing exemplars in Prometheus when the OpenTelemetry Collector receives them but they do not appear in query results.

Exemplars link metrics to traces. When you record a histogram measurement, you can attach the current trace ID as an exemplar. This lets you click on a metric data point in Grafana and jump directly to the trace that produced it. But getting exemplars to flow from the SDK through the Collector to Prometheus requires multiple pieces to be configured correctly.

## How Exemplars Flow

```
SDK records metric with exemplar (trace_id, span_id)
  -> OTLP to Collector
  -> Collector exports to Prometheus (remote write or scrape)
  -> Prometheus stores exemplar
  -> Grafana queries exemplar and links to Tempo
```

If any step drops the exemplar, it disappears.

## Step 1: Verify the SDK Sends Exemplars

The OpenTelemetry SDK automatically attaches exemplars to histograms when a span is active. Verify by checking the OTLP export:

```go
// Go: exemplars are attached automatically when
// a span context is in the context
func recordLatency(ctx context.Context, duration time.Duration) {
    // This automatically includes an exemplar with trace_id and span_id
    // because ctx contains an active span
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
      exporters: [prometheusremotewrite]
```

Add the debug exporter to verify:

```yaml
exporters:
  debug:
    verbosity: detailed
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite, debug]
```

Check the Collector logs for exemplar data in the debug output.

## Step 3: Verify Prometheus Is Configured for Exemplars

Prometheus must have exemplar storage enabled. This is not on by default:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

# Enable exemplar storage via command-line flag
# --enable-feature=exemplar-storage
```

Start Prometheus with the feature flag:

```bash
prometheus --config.file=prometheus.yml \
  --enable-feature=exemplar-storage \
  --storage.exemplars.max-exemplars=100000
```

In Kubernetes:

```yaml
containers:
- name: prometheus
  image: prom/prometheus:v2.53.0
  args:
  - "--config.file=/etc/prometheus/prometheus.yml"
  - "--enable-feature=exemplar-storage"
  - "--storage.exemplars.max-exemplars=100000"
```

## Step 4: Use Prometheus Remote Write (Not Scrape) for Exemplars

If you use the `prometheus` exporter (scrape model), exemplars might not work reliably because the Prometheus scrape format has limited exemplar support. Use `prometheusremotewrite` instead:

```yaml
exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true
```

Prometheus must have remote write receiver enabled:

```bash
prometheus --enable-feature=remote-write-receiver \
  --enable-feature=exemplar-storage
```

## Step 5: Configure Grafana to Show Exemplars

In Grafana, exemplars are displayed as dots on graph panels. Configure the panel:

1. Open the panel editor
2. In the query options, enable "Exemplars"
3. Make sure the data source is configured with a Tempo link

In the Prometheus data source settings:

```
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

```
# This drops exemplars
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)

# This preserves exemplars (no aggregation across series)
rate(http_request_duration_seconds_bucket{instance="app-1:8080"}[5m])
```

### Pitfall 2: Exemplar Storage Is Full

Prometheus has a fixed-size exemplar storage. When it fills up, old exemplars are evicted:

```bash
# Increase the limit
prometheus --storage.exemplars.max-exemplars=500000
```

### Pitfall 3: Wrong Exemplar Label Name

Grafana expects the exemplar label to be `traceID` (by default). If the OpenTelemetry SDK uses a different label name, configure it in the data source.

## Summary

Getting exemplars to work requires: SDK generates exemplars (automatic with active span), Collector preserves and exports them (use prometheusremotewrite), Prometheus has exemplar storage enabled (feature flag), and Grafana is configured to display them. Test each step independently to find where exemplars are being lost.
