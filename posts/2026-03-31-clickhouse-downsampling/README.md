# How to Implement Downsampling in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Downsampling, Time-Series, Retention, Aggregation

Description: Learn how to implement time-series downsampling in ClickHouse using materialized views, TTL, and AggregatingMergeTree to reduce storage while preserving trends.

---

## Why Downsampling

High-resolution time-series data grows rapidly. Metrics sampled every second for a year consume enormous storage. Downsampling aggregates old high-resolution data into coarser buckets: seconds to minutes, minutes to hours, hours to days. ClickHouse automates this with materialized views and TTL policies.

## Multi-Resolution Schema

Maintain three tables at different granularities:

```sql
-- Raw: 1-second resolution
CREATE TABLE metrics_raw
(
    service     LowCardinality(String),
    metric      LowCardinality(String),
    ts          DateTime,
    value       Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (service, metric, ts)
TTL ts + INTERVAL 7 DAY;

-- 1-minute rollup
CREATE TABLE metrics_1m
(
    service     LowCardinality(String),
    metric      LowCardinality(String),
    ts_bucket   DateTime,
    avg_value   Float64,
    min_value   Float64,
    max_value   Float64,
    sample_count UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts_bucket)
ORDER BY (service, metric, ts_bucket)
TTL ts_bucket + INTERVAL 30 DAY;

-- 1-hour rollup
CREATE TABLE metrics_1h
(
    service     LowCardinality(String),
    metric      LowCardinality(String),
    ts_bucket   DateTime,
    avg_value   Float64,
    min_value   Float64,
    max_value   Float64,
    sample_count UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts_bucket)
ORDER BY (service, metric, ts_bucket);
```

## Materialized Views for Automatic Rollup

Automatically populate the 1-minute table from raw inserts:

```sql
CREATE MATERIALIZED VIEW metrics_raw_to_1m
TO metrics_1m
AS
SELECT
    service,
    metric,
    toStartOfMinute(ts) AS ts_bucket,
    avg(value) AS avg_value,
    min(value) AS min_value,
    max(value) AS max_value,
    count() AS sample_count
FROM metrics_raw
GROUP BY service, metric, ts_bucket;
```

## TTL-Based Automatic Expiry

The `TTL ts + INTERVAL 7 DAY` clause in `metrics_raw` automatically deletes high-resolution data after 7 days, keeping only the rolled-up versions.

## Query Routing

Select the appropriate resolution based on the requested time range:

```sql
-- For last hour: use raw
SELECT ts, value FROM metrics_raw
WHERE service = 'api' AND metric = 'latency_ms'
  AND ts >= now() - INTERVAL 1 HOUR;

-- For last 7 days: use 1-minute rollup
SELECT ts_bucket, avg_value FROM metrics_1m
WHERE service = 'api' AND metric = 'latency_ms'
  AND ts_bucket >= now() - INTERVAL 7 DAY;

-- For last year: use 1-hour rollup
SELECT ts_bucket, avg_value FROM metrics_1h
WHERE service = 'api' AND metric = 'latency_ms'
  AND ts_bucket >= now() - INTERVAL 365 DAY;
```

## On-Demand Downsampling

For historical backfills, manually populate rollup tables:

```sql
INSERT INTO metrics_1h
SELECT
    service,
    metric,
    toStartOfHour(ts_bucket) AS ts_bucket,
    avg(avg_value) AS avg_value,
    min(min_value) AS min_value,
    max(max_value) AS max_value,
    sum(sample_count) AS sample_count
FROM metrics_1m
WHERE ts_bucket < now() - INTERVAL 30 DAY
GROUP BY service, metric, toStartOfHour(ts_bucket);
```

## Summary

ClickHouse downsampling uses materialized views to automatically aggregate raw data into coarser buckets and TTL policies to expire high-resolution data after a configurable retention window. Maintaining multiple resolution tables and routing queries to the right table based on time range balances accuracy and performance.
