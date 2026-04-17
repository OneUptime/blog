# How to Design a Pre-Aggregated Summary Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pre-Aggregation, SummingMergeTree, AggregatingMergeTree, Materialized View, Performance

Description: Learn how to design pre-aggregated summary tables in ClickHouse using SummingMergeTree and materialized views to power fast dashboard queries.

---

Pre-aggregated summary tables store rolled-up results that would otherwise require expensive full-table aggregations at query time. This is the most impactful performance optimization for high-frequency dashboard queries in ClickHouse.

## When to Use Summary Tables

```text
- Dashboard queries run on the same aggregation hundreds of times per minute
- Raw data is too large to aggregate in real time
- You need sub-100ms response times
- Multiple teams query the same rollup
```

## Pattern 1: SummingMergeTree

For simple additive aggregations (sum, count):

```sql
-- Summary table
CREATE TABLE revenue_daily (
    date Date,
    service LowCardinality(String),
    region LowCardinality(String),
    total_revenue Decimal64(2),
    order_count UInt64,
    error_count UInt64
) ENGINE = SummingMergeTree((total_revenue, order_count, error_count))
ORDER BY (date, service, region);

-- Populate via materialized view
CREATE MATERIALIZED VIEW revenue_daily_mv TO revenue_daily AS
SELECT
    toDate(ordered_at) AS date,
    service,
    region,
    sum(revenue) AS total_revenue,
    count() AS order_count,
    countIf(status = 'error') AS error_count
FROM orders
GROUP BY date, service, region;
```

Query is extremely fast:

```sql
SELECT
    date,
    service,
    sum(total_revenue) AS revenue,
    sum(order_count) AS orders
FROM revenue_daily
WHERE date >= today() - 30
GROUP BY date, service
ORDER BY date, service;
```

## Pattern 2: AggregatingMergeTree

For complex aggregations that are not just sums (avg, quantiles, HLL):

```sql
CREATE TABLE request_stats_hourly (
    hour DateTime,
    service LowCardinality(String),
    total_count AggregateFunction(count),
    error_count AggregateFunction(countIf, UInt8),
    avg_duration AggregateFunction(avg, Float64),
    p95_duration AggregateFunction(quantile(0.95), Float64),
    unique_users AggregateFunction(uniq, UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (hour, service);

-- Populate via materialized view
CREATE MATERIALIZED VIEW request_stats_mv TO request_stats_hourly AS
SELECT
    toStartOfHour(timestamp) AS hour,
    service,
    countState() AS total_count,
    countIfState(status_code >= 500) AS error_count,
    avgState(duration_ms) AS avg_duration,
    quantileState(0.95)(duration_ms) AS p95_duration,
    uniqState(user_id) AS unique_users
FROM http_requests
GROUP BY hour, service;
```

Query using `-Merge` combinators:

```sql
SELECT
    hour,
    service,
    countMerge(total_count) AS requests,
    countIfMerge(error_count) AS errors,
    avgMerge(avg_duration) AS avg_ms,
    quantileMerge(0.95)(p95_duration) AS p95_ms,
    uniqMerge(unique_users) AS dau
FROM request_stats_hourly
WHERE hour >= now() - INTERVAL 24 HOUR
GROUP BY hour, service
ORDER BY hour, service;
```

## Multi-Level Rollups

Create rollups at multiple granularities:

```sql
-- 1-minute rollup (from raw)
CREATE MATERIALIZED VIEW metrics_1m_mv TO metrics_1m AS ...

-- 1-hour rollup (from 1-minute rollup)
CREATE MATERIALIZED VIEW metrics_1h_mv TO metrics_1h AS
SELECT
    toStartOfHour(minute) AS hour,
    service,
    sumMerge(sum_value) AS sum_value,
    maxMerge(max_value) AS max_value
FROM metrics_1m
GROUP BY hour, service;
```

## Backfilling Summary Tables

Populate historical data into a new summary table:

```sql
INSERT INTO revenue_daily
SELECT
    toDate(ordered_at) AS date,
    service,
    region,
    sum(revenue) AS total_revenue,
    count() AS order_count,
    countIf(status = 'error') AS error_count
FROM orders
WHERE ordered_at >= '2025-01-01'
GROUP BY date, service, region;
```

## Summary

Pre-aggregated summary tables in ClickHouse, backed by materialized views and engines like `SummingMergeTree` and `AggregatingMergeTree`, are the most powerful tool for fast dashboard queries. They shift aggregation cost from query time to insert time, enabling sub-millisecond responses on datasets with billions of raw rows.
