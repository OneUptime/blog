# How to Build Per-Minute Aggregations with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Time Series, Per-Minute Aggregation, SummingMergeTree

Description: Build per-minute metric aggregations in ClickHouse using materialized views to power real-time dashboards without scanning raw event streams.

---

## Per-Minute Metrics for Real-Time Dashboards

Real-time operational dashboards need per-minute aggregations for metrics like requests per minute (RPM), error rates, and p99 latency. Scanning the raw events table for every dashboard refresh is wasteful. Materialized views pre-compute these per-minute summaries automatically on insert.

## Raw Metrics Table

```sql
CREATE TABLE http_requests
(
    request_time DateTime,
    service LowCardinality(String),
    endpoint LowCardinality(String),
    status_code UInt16,
    duration_ms UInt32,
    bytes_sent UInt32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(request_time)
ORDER BY (service, endpoint, request_time);
```

## Per-Minute Summary Materialized View

```sql
-- Target table
CREATE TABLE http_requests_per_minute
(
    minute DateTime,
    service LowCardinality(String),
    endpoint LowCardinality(String),
    request_count UInt64,
    error_count UInt64,
    total_duration_ms UInt64,
    max_duration_ms SimpleAggregateFunction(max, UInt32),
    bytes_total UInt64,
    -- For quantile calculations, store AggregateFunction
    duration_quantile AggregateFunction(quantile(0.99), UInt32)
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(minute)
ORDER BY (minute, service, endpoint);

-- Materialized view
CREATE MATERIALIZED VIEW http_requests_per_minute_mv
TO http_requests_per_minute
AS
SELECT
    toStartOfMinute(request_time) AS minute,
    service,
    endpoint,
    count() AS request_count,
    countIf(status_code >= 500) AS error_count,
    sum(duration_ms) AS total_duration_ms,
    max(duration_ms) AS max_duration_ms,
    sum(bytes_sent) AS bytes_total,
    quantileState(0.99)(duration_ms) AS duration_quantile
FROM http_requests
GROUP BY minute, service, endpoint;
```

## Query the Per-Minute Data

```sql
-- Last 30 minutes of RPM and error rate per service
SELECT
    minute,
    service,
    sum(request_count) AS rpm,
    sum(error_count) AS errors_per_min,
    round(sum(error_count) / nullIf(sum(request_count), 0) * 100, 2) AS error_rate_pct,
    round(sum(total_duration_ms) / nullIf(sum(request_count), 0), 1) AS avg_latency_ms,
    quantileMerge(0.99)(duration_quantile) AS p99_latency_ms
FROM http_requests_per_minute
WHERE minute >= now() - INTERVAL 30 MINUTE
GROUP BY minute, service
ORDER BY minute, service;
```

## Rollup to Hourly

You can chain materialized views to create hourly rollups from the per-minute table:

```sql
CREATE TABLE http_requests_per_hour
(
    hour DateTime,
    service LowCardinality(String),
    request_count UInt64,
    error_count UInt64,
    total_duration_ms UInt64
)
ENGINE = SummingMergeTree
ORDER BY (hour, service);

CREATE MATERIALIZED VIEW http_requests_per_hour_mv
TO http_requests_per_hour
AS
SELECT
    toStartOfHour(minute) AS hour,
    service,
    sum(request_count) AS request_count,
    sum(error_count) AS error_count,
    sum(total_duration_ms) AS total_duration_ms
FROM http_requests_per_minute
GROUP BY hour, service;
```

## Handling Late Data

By default, materialized views only process data at insert time. For late-arriving events, insert them into the raw table - the MV will process them automatically. Since SummingMergeTree merges rows with the same sorting key in the background, the late data will be correctly combined with existing per-minute entries. To force this merge immediately:

```sql
-- Force merge of all parts so SummingMergeTree combines matching keys
OPTIMIZE TABLE http_requests_per_minute FINAL;
```

## Summary

Per-minute aggregation in ClickHouse uses SummingMergeTree target tables populated by materialized views that fire on raw event inserts. This pattern keeps raw data in the base table while maintaining cheap pre-computed summaries for dashboards. Store `quantileState` alongside counters to support p99 latency queries on the pre-aggregated data.
