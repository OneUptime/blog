# How to Build a Self-Hosted Metrics Platform with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Metric, Self-Hosted, Prometheus, Grafana

Description: Build a self-hosted metrics platform with ClickHouse, Prometheus, and Grafana for long-term metrics storage with SQL-based analysis and lower costs.

---

## The Problem with Default Prometheus Storage

Prometheus stores metrics on local disk and is typically configured with 15-30 days of retention. For trend analysis, capacity planning, or anomaly detection across months of data, you need a long-term storage backend.

ClickHouse is an excellent choice: it compresses time-series data well with the Gorilla and Delta codecs, scales to petabytes, and allows SQL joins between metrics and business data.

## Architecture

```text
Prometheus --> Remote Write --> ClickHouse Prometheus Adapter --> ClickHouse
Grafana --> SQL queries --> ClickHouse (long-term)
Grafana --> PromQL queries --> Prometheus (short-term)
```

## ClickHouse Metrics Schema

```sql
CREATE TABLE metrics.samples (
    service      LowCardinality(String),
    metric_name  LowCardinality(String),
    labels       Map(String, String),
    timestamp    DateTime64(3) CODEC(Delta(8), ZSTD),
    value        Float64 CODEC(Gorilla, ZSTD)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (metric_name, service, timestamp)
TTL toDate(timestamp) + INTERVAL 1 YEAR DELETE;
```

## Prometheus Remote Write Config

```text
remote_write:
  - url: http://ch-adapter:9201/write
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*|process_.*'
        action: drop  # drop noisy internal metrics
    queue_config:
      max_samples_per_send: 5000
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 5s
```

## Aggregation Rules for Long-Term Storage

Reduce storage by downsampling older data using scheduled queries:

```sql
-- Hourly rollup for data older than 7 days
INSERT INTO metrics.samples_hourly
SELECT
    service,
    metric_name,
    labels,
    toStartOfHour(timestamp) AS timestamp,
    avg(value) AS value
FROM metrics.samples
WHERE toDate(timestamp) BETWEEN today() - 8 AND today() - 7
GROUP BY service, metric_name, labels, timestamp;
```

## Long-Term Trend Queries

Infrastructure capacity planning with 6 months of data:

```sql
SELECT
    toStartOfDay(timestamp) AS day,
    service,
    max(value) AS peak_cpu,
    avg(value) AS avg_cpu
FROM metrics.samples
WHERE metric_name = 'node_cpu_utilization'
  AND timestamp >= now() - INTERVAL 180 DAY
GROUP BY day, service
ORDER BY day;
```

## Anomaly Detection with Statistical Functions

Detect services with unusually high error rates compared to their 30-day average:

```sql
SELECT
    service,
    avg(value) AS current_rate,
    (SELECT avg(value) FROM metrics.samples
     WHERE metric_name = m.metric_name
       AND service = m.service
       AND timestamp >= now() - INTERVAL 30 DAY) AS baseline_rate,
    current_rate / baseline_rate AS ratio
FROM metrics.samples m
WHERE metric_name = 'http_error_rate'
  AND timestamp >= now() - INTERVAL 1 HOUR
GROUP BY service, metric_name
HAVING ratio > 2.0
ORDER BY ratio DESC;
```

## Cost Benefits

ClickHouse's columnar storage format, combined with codecs like Gorilla and Delta plus secondary ZSTD compression, achieves 3-4x better compression on metrics data compared to Prometheus TSDB, reducing long-term storage costs significantly.

## Summary

A self-hosted metrics platform combining Prometheus for real-time alerting and ClickHouse for long-term storage gives you the best of both worlds: PromQL for alerting rules and SQL for trend analysis, capacity planning, and cross-domain analytics.
