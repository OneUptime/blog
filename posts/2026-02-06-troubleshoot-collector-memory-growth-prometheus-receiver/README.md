# How to Troubleshoot Collector Memory Growth Over Days Caused by the Prometheus Receiver Metric Accumulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Prometheus, Memory

Description: Diagnose and fix gradual memory growth in the OpenTelemetry Collector caused by the Prometheus receiver accumulating metrics.

Your OpenTelemetry Collector looks healthy on day one. Memory usage is stable at 200MB. By day three, it is at 800MB. By day seven, it hits the container limit and gets OOM-killed. The Prometheus receiver is the likely culprit.

## Why the Prometheus Receiver Accumulates Memory

The Prometheus receiver scrapes targets and converts Prometheus metrics into the OpenTelemetry metric format. To do this conversion correctly, it maintains internal state for each time series it has seen. This state includes:

- Metric metadata (name, type, help text)
- The last scraped value for each time series (needed for cumulative-to-delta conversions)
- Stale marker tracking

When targets produce new time series (due to pod restarts, label changes, or high cardinality), the receiver accumulates state for each unique series. If old series are never cleaned up, memory grows indefinitely.

## Identifying the Problem

Check the number of active time series the receiver is tracking:

```bash
# Query the Collector's internal metrics
curl -s http://localhost:8888/metrics | grep "scrape_series"
```

Look at the Prometheus receiver's scrape metrics:

```
prometheus_target_scrapes_sample_out_of_order_total
prometheus_target_scrapes_sample_duplicate_total
prometheus_tsdb_head_series
```

If `prometheus_tsdb_head_series` keeps growing, series are accumulating without being cleaned up.

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

### 3. Missing Staleness Handling

The Prometheus receiver should mark series as stale when a target disappears, but certain configurations can prevent proper staleness detection.

## Fix 1: Enable Staleness Tracking

Make sure the receiver properly handles stale series:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        scrape_interval: 30s
        # Honor timestamps helps with staleness
        honor_timestamps: true
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

## Fix 5: Use the Filter Processor

Add a filter processor to drop unwanted metrics after scraping:

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

Set up an alert for the receiver's memory footprint:

```yaml
# Alert when series count is growing too fast
- alert: PrometheusReceiverSeriesGrowth
  expr: delta(prometheus_tsdb_head_series[1h]) > 10000
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Prometheus receiver series count growing rapidly"
```

The Prometheus receiver's memory growth is a function of unique time series count. Control the series count through relabeling, filtering, and sample limits. Monitor the series count over time and set alerts to catch runaway growth before it causes OOM kills.
