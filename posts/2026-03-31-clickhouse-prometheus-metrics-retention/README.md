# How to Use ClickHouse for Prometheus Metrics Long-Term Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Metric, Retention, Long-Term Storage

Description: Learn strategies for storing Prometheus metrics in ClickHouse for multi-year retention using remote write adapters, schema design, and TTL management.

---

## The Problem with Prometheus Retention

Prometheus stores metrics locally with a default 15-day retention window. Scaling beyond 60-90 days requires significant disk and memory. ClickHouse provides compressed columnar storage that can hold years of metrics at a fraction of the cost.

## Schema Design for Long-Term Metrics

A well-designed metrics table for Prometheus data:

```sql
CREATE TABLE prometheus_metrics (
  metric_name    LowCardinality(String),
  labels         Map(LowCardinality(String), String),
  timestamp      DateTime64(3) CODEC(Delta, ZSTD(1)),
  value          Float64 CODEC(ZSTD(1)),
  date           Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (metric_name, timestamp)
TTL date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192
```

## Ingesting via Remote Write Adapter

Use the `prometheus-remote-storage-clickhouse` adapter or `VictoriaMetrics` with a ClickHouse backend:

```yaml
remote_write:
  - url: http://clickhouse-adapter:9201/write
    remote_timeout: 30s
    queue_config:
      capacity: 500000
      max_shards: 200
      max_samples_per_send: 10000
      batch_send_deadline: 5s
```

## Tiered Retention with TTL Moves

ClickHouse supports moving data to cheaper storage before deleting it, enabling tiered retention:

```sql
CREATE TABLE prometheus_metrics (
  metric_name LowCardinality(String),
  timestamp   DateTime64(3) CODEC(Delta, ZSTD(1)),
  value       Float64 CODEC(ZSTD(1)),
  date        Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
ORDER BY (metric_name, timestamp)
TTL
  date + INTERVAL 30 DAY TO DISK 'cold_s3',
  date + INTERVAL 2 YEAR DELETE
```

## Downsampling Old Data

For metrics older than 30 days, store 1-minute averages instead of raw data:

```sql
CREATE MATERIALIZED VIEW prometheus_metrics_1m
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(ts_minute)
ORDER BY (metric_name, ts_minute)
AS SELECT
  metric_name,
  labels,
  toStartOfMinute(timestamp) AS ts_minute,
  avgState(value) AS avg_value
FROM prometheus_metrics
GROUP BY metric_name, labels, ts_minute
```

## Query Example - Service Error Rate Over 90 Days

```sql
SELECT
  toStartOfHour(timestamp) AS hour,
  sum(if(metric_name = 'http_requests_total' AND labels['status'] = '500', value, 0)) /
  sum(if(metric_name = 'http_requests_total', value, 0)) AS error_rate
FROM prometheus_metrics
WHERE timestamp >= now() - INTERVAL 90 DAY
  AND metric_name IN ('http_requests_total')
GROUP BY hour
ORDER BY hour
```

## Storage Cost Comparison

At 1 million time series with 30s scrape interval, ClickHouse typically achieves 2-4 bytes per sample after compression, compared to 2-8 bytes in Prometheus's native TSDB. For 2-year retention, ClickHouse with S3-tiered storage is 80-90% cheaper than in-memory or SSD-backed Prometheus federation.

## Summary

ClickHouse provides scalable, cost-effective long-term storage for Prometheus metrics using a remote write adapter, a partitioned MergeTree table with TTL, and optional downsampling materialized views. Tiered TTL moves old data to S3 automatically, reducing storage costs for multi-year retention without changing query interfaces.
