# How to Troubleshoot Collector Memory Growth Over Days Caused by the Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Prometheus, Memory

Description: Diagnose and fix gradual memory growth in the OpenTelemetry Collector caused by the Prometheus receiver accumulating metrics.

Your OpenTelemetry Collector looks healthy on day one. Memory usage is stable at 200MB. By day three, it is at 800MB. By day seven, it hits the container limit and gets OOM-killed. If the Collector is scraping high-cardinality or high-churn targets, the Prometheus receiver is a likely culprit.

## Why the Prometheus Receiver Accumulates Memory

The Prometheus receiver scrapes targets and converts Prometheus metrics into the OpenTelemetry metric format. To do this conversion correctly, it maintains internal state for each time series it has seen. This state includes:

- Metric metadata (name, type, help text)
- Scrape cache entries for series identity and lifecycle handling
- Stale marker tracking

When targets produce new time series (due to pod restarts, label changes, or high cardinality), the receiver accumulates state for each unique series. If old series are never cleaned up, memory grows indefinitely.

## Identifying the Problem

Check the Collector's own memory metric:

```bash
# Query the Collector's internal metrics

curl -s http://localhost:8888/metrics | grep "otelcol_process_memory_rss"
```

Then check whether scrapes are constantly introducing new series by querying the scrape metrics exported by your metrics pipeline:

```text
scrape_series_added
scrape_samples_scraped
scrape_samples_post_metric_relabeling
```

If `scrape_series_added` stays high over time while `otelcol_process_memory_rss` keeps growing, the receiver is seeing continuous series churn. If you also scrape a Prometheus server, `prometheus_tsdb_head_series` is useful for that Prometheus server's TSDB, but it is not the Collector receiver's active-series metric.

## Common Causes

### 1. Scraping Targets with High-Cardinality Labels

```yaml
# collector-config.yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
```

If pods produce metrics with high-cardinality labels (like request IDs or timestamps), each unique label set creates a new series that the receiver tracks.

### 2. Pod Churn in Kubernetes

When pods restart, they get new IPs and new instance labels. The receiver sees the new pod as a new target and starts tracking new series. The old series from the terminated pod remain in memory.

### 3. Missing Explicit Timestamp Staleness Handling

The Prometheus receiver should mark series as stale when a target disappears, but metrics with explicit timestamps need additional staleness tracking.

## Fix 1: Enable Explicit Timestamp Staleness Tracking

Make sure the receiver properly handles stale series for metrics that include explicit timestamps:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        scrape_interval: 30s
        honor_timestamps: true
        track_timestamps_staleness: true
        kubernetes_sd_configs:
        - role: pod
```

## Fix 2: Use metric_relabel_configs to Drop High-Cardinality Series

Filter out series with problematic labels before they accumulate:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        scrape_interval: 30s
        kubernetes_sd_configs:
        - role: pod
        metric_relabel_configs:
        # Drop metrics with high-cardinality labels
        - source_labels: [__name__]
          regex: "go_gc_.*"
          action: drop
        # Drop metrics with too many label values
        - source_labels: [request_id]
          regex: ".+"
          action: drop
        # Keep only specific metrics
        - source_labels: [__name__]
          regex: "(http_requests_total|http_request_duration_seconds|up)"
          action: keep
```

## Fix 3: Limit the Number of Scraped Targets

Use relabeling to limit which targets are scraped:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        # Only scrape pods with a specific annotation
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        # Use the pod name as the instance label (more stable)
        - source_labels: [__meta_kubernetes_pod_name]
          target_label: instance
```

## Fix 4: Set sample_limit Per Scrape Config

Limit the number of samples accepted per scrape:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        sample_limit: 5000  # reject scrapes with more than 5000 samples
        kubernetes_sd_configs:
        - role: pod
```

If a target returns more than 5000 samples, the entire scrape is rejected. This prevents cardinality explosions from a single misbehaving target.

## Fix 5: Use the Filter Processor for Downstream Volume

Add a filter processor to drop unwanted metrics after scraping. This reduces what the Collector exports, but because it runs after the Prometheus receiver, use `metric_relabel_configs` first when the goal is to reduce scrape-time receiver state:

```yaml
processors:
  filter/metrics:
    metrics:
      exclude:
        match_type: regexp
        metric_names:
        - "go_.*"
        - "process_.*"
        - "promhttp_.*"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, filter/metrics, batch]
      exporters: [prometheusremotewrite]
```

## Monitoring the Receiver

Set up an alert for sustained series churn:

```yaml
# Alert when series count is growing too fast
- alert: PrometheusReceiverSeriesGrowth
  expr: sum_over_time(scrape_series_added[1h]) > 10000
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Prometheus receiver series count growing rapidly"
```

The Prometheus receiver's memory growth is a function of unique time series count. Control the series count through relabeling, filtering, and sample limits. Monitor the series count over time and set alerts to catch runaway growth before it causes OOM kills.
