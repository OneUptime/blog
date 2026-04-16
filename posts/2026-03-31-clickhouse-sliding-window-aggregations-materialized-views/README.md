# How to Build Sliding Window Aggregations with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Sliding Window, Window Function, Time Series

Description: Implement sliding window aggregations in ClickHouse using materialized views with per-minute pre-aggregation, then apply window functions at query time for rolling metrics.

---

## Sliding Windows in Analytics

Sliding window metrics like "requests in the last 5 minutes", "7-day rolling average revenue", and "30-minute error rate" require efficient access to recent data aggregated over a moving time window. ClickHouse's window functions combined with materialized views make these queries fast.

## The Two-Layer Pattern

The efficient approach uses two layers:
1. A materialized view pre-aggregates raw events into per-minute buckets
2. Query-time window functions slide across those pre-aggregated buckets

## Pre-Aggregated Metric Buckets

```sql
CREATE TABLE metric_buckets
(
    bucket_time DateTime,
    metric_name LowCardinality(String),
    service LowCardinality(String),
    value_sum Float64,
    value_count UInt64,
    value_max SimpleAggregateFunction(max, Float64)
)
ENGINE = SummingMergeTree
PARTITION BY toDate(bucket_time)
ORDER BY (bucket_time, metric_name, service);

CREATE MATERIALIZED VIEW metric_buckets_mv
TO metric_buckets
AS
SELECT
    toStartOfMinute(event_time) AS bucket_time,
    metric_name,
    service,
    sum(value) AS value_sum,
    count() AS value_count,
    max(value) AS value_max
FROM raw_metrics
GROUP BY bucket_time, metric_name, service;
```

## 5-Minute Sliding Window Query

```sql
-- 5-minute rolling sum for the last hour
SELECT
    bucket_time,
    service,
    sum(value_sum) OVER (
        PARTITION BY service
        ORDER BY bucket_time
        RANGE BETWEEN INTERVAL 4 MINUTE PRECEDING AND CURRENT ROW
    ) AS rolling_5min_sum,
    sum(value_count) OVER (
        PARTITION BY service
        ORDER BY bucket_time
        RANGE BETWEEN INTERVAL 4 MINUTE PRECEDING AND CURRENT ROW
    ) AS rolling_5min_count
FROM (
    SELECT
        bucket_time,
        service,
        sum(value_sum) AS value_sum,
        sum(value_count) AS value_count
    FROM metric_buckets
    WHERE bucket_time >= now() - INTERVAL 1 HOUR
      AND metric_name = 'http_requests'
    GROUP BY bucket_time, service
)
ORDER BY bucket_time, service;
```

## 7-Day Rolling Average Revenue

```sql
-- Daily revenue with 7-day rolling average
WITH daily_revenue AS (
    SELECT
        toDate(bucket_time) AS revenue_date,
        sum(value_sum) AS daily_revenue
    FROM metric_buckets
    WHERE metric_name = 'revenue'
      AND bucket_time >= today() - 60
    GROUP BY revenue_date
)
SELECT
    revenue_date,
    daily_revenue,
    avg(daily_revenue) OVER (
        ORDER BY revenue_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7day_avg
FROM daily_revenue
ORDER BY revenue_date;
```

## Rate of Change Detection

```sql
-- Detect sudden metric spikes (current 5-min vs previous 5-min)
WITH windows AS (
    SELECT
        service,
        sum(value_sum) OVER (
            PARTITION BY service ORDER BY bucket_time
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ) AS current_window,
        sum(value_sum) OVER (
            PARTITION BY service ORDER BY bucket_time
            ROWS BETWEEN 9 PRECEDING AND 5 PRECEDING
        ) AS previous_window,
        bucket_time
    FROM metric_buckets
    WHERE metric_name = 'error_count'
      AND bucket_time >= now() - INTERVAL 30 MINUTE
)
SELECT
    service,
    max(bucket_time) AS latest,
    current_window,
    previous_window,
    round(current_window / nullIf(previous_window, 0), 2) AS spike_ratio
FROM windows
GROUP BY service, current_window, previous_window
HAVING spike_ratio > 2.0
ORDER BY spike_ratio DESC;
```

## Summary

Sliding window aggregations in ClickHouse use a two-layer architecture: materialized views pre-aggregate raw events into minute-level buckets, then query-time window functions (using ROWS or RANGE frames) slide across those buckets for rolling metrics. This pattern delivers sub-second results for 5-minute, 1-hour, and 7-day rolling windows on high-throughput event streams.
