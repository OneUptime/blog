# How to Fix the Collector Using Excessive Memory When Processing High-Cardinality Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Prometheus, Cardinality

Description: Fix excessive memory usage in the OpenTelemetry Collector when processing high-cardinality Prometheus metrics with many label combinations.

The OpenTelemetry Collector scrapes Prometheus endpoints, converts the metrics, and forwards them to your backend. When those Prometheus metrics have high cardinality (many unique label combinations), the Collector's memory usage can grow out of control. Here is how to identify and fix the problem.

## Understanding the Memory Impact

Each unique combination of metric name and label values creates a time series. The Collector tracks state for each series to handle cumulative-to-delta conversions and staleness detection.

For example, if an application exports:

```
http_requests_total{method="GET", path="/users/1", status="200"} 42
http_requests_total{method="GET", path="/users/2", status="200"} 15
http_requests_total{method="GET", path="/users/3", status="200"} 8
...
```

Each unique `path` value creates a new time series. With 100,000 unique paths, you get 100,000 time series just for this one metric.

## Step 1: Identify the High-Cardinality Metrics

Use the Collector's Prometheus scrape target to find problematic metrics:

```bash
# Scrape a target and count unique series
curl -s http://your-app:8080/metrics | \
  grep -v "^#" | \
  awk -F'{' '{print $1}' | \
  sort | uniq -c | sort -rn | head -20
```

This shows the top 20 metric names by series count. Look for metrics with thousands of series.

You can also use the `prometheusreceiver` internal metrics:

```
# Total number of active time series
prometheus_tsdb_head_series

# Series created per scrape
prometheus_target_scrapes_sample_duplicate_total
```

## Step 2: Drop High-Cardinality Labels at Scrape Time

Use `metric_relabel_configs` to drop or aggregate labels before they enter the Collector:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'my-app'
        scrape_interval: 30s
        static_configs:
        - targets: ['my-app:8080']
        metric_relabel_configs:
        # Drop the high-cardinality 'path' label entirely
        - action: labeldrop
          regex: 'path'

        # Or replace it with a normalized version
        - source_labels: [path]
          target_label: path
          regex: '/users/[0-9]+'
          replacement: '/users/{id}'

        # Drop entire metrics that are not needed
        - source_labels: [__name__]
          regex: 'go_gc_.*'
          action: drop
```

## Step 3: Use the Filter Processor

If you cannot change the scrape config (e.g., using service discovery), add a filter processor:

```yaml
processors:
  filter/high-cardinality:
    metrics:
      metric:
      # Drop metrics by name
      - 'IsMatch(name, "internal_.*")'
      datapoint:
      # Drop data points with specific label values
      - 'IsMatch(attributes["path"], "/users/[0-9]+")'
```

```yaml
service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [memory_limiter, filter/high-cardinality, batch]
      exporters: [prometheusremotewrite]
```

## Step 4: Use the Transform Processor to Normalize Labels

Instead of dropping labels, normalize them to reduce cardinality:

```yaml
processors:
  transform/normalize:
    metric_statements:
    - context: datapoint
      statements:
      # Replace numeric path segments with a placeholder
      - replace_pattern(attributes["http.route"],
          "/users/[0-9]+", "/users/{id}")
      - replace_pattern(attributes["http.route"],
          "/orders/[0-9]+", "/orders/{id}")
```

## Step 5: Set sample_limit to Protect Against Surprises

Even after tuning, a new deployment might introduce new high-cardinality metrics. Protect the Collector with a `sample_limit`:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'my-app'
        sample_limit: 10000  # reject scrapes with > 10k samples
        static_configs:
        - targets: ['my-app:8080']
```

When a scrape exceeds the limit, it is rejected entirely and an error is logged. This prevents a sudden cardinality explosion from crashing the Collector.

## Step 6: Monitor Cardinality Over Time

Set up alerts to detect cardinality creep:

```yaml
# Alert if series count grows too fast
- alert: HighCardinalityGrowth
  expr: |
    rate(prometheus_tsdb_head_series[1h]) > 1000
  for: 30m
  annotations:
    summary: "Time series count growing by >1000/hour"

# Alert if a single scrape returns too many samples
- alert: LargeScrapeTarget
  expr: |
    scrape_samples_scraped > 50000
  for: 10m
  annotations:
    summary: "Scrape target returning >50k samples"
```

## Application-Side Fixes

The best fix is to reduce cardinality at the source. Talk to the application team about:

1. Using route templates instead of actual URLs in metrics labels
2. Removing user IDs, session IDs, or request IDs from metric labels
3. Using histograms with bounded bucket counts instead of individual gauges
4. Limiting the number of unique label values in application code

```python
# BAD: unbounded cardinality
requests_total.labels(path=request.path).inc()

# GOOD: bounded cardinality
requests_total.labels(path=normalize_path(request.path)).inc()
```

High-cardinality Prometheus metrics are a memory problem for every component in the pipeline: the application, the Collector, and the backend. Fix it at the source when possible, and use Collector-level filters as a safety net.
