# How to Optimize Aggregation Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to maximize ClickHouse aggregation performance using AggregatingMergeTree, pre-aggregation, approximate functions, and query-level tuning techniques.

## Introduction

Aggregations are the heart of analytical workloads, and ClickHouse is purpose-built to run them fast. However, even with ClickHouse's columnar storage and vectorized execution, poorly designed schemas or missing optimizations can leave significant performance on the table. This guide covers schema-level and query-level optimizations for GROUP BY queries, COUNT DISTINCT, and complex multi-pass aggregations.

## Use LowCardinality for Group-By Columns

Grouping on `LowCardinality(String)` is significantly faster than grouping on `String` because ClickHouse stores dictionary-encoded integers internally and groups on those integers rather than the raw strings.

```sql
-- Slower: grouping on String
CREATE TABLE events_slow (
    service    String,
    event_type String,
    value      Float64,
    ts         DateTime
) ENGINE = MergeTree() ORDER BY (ts, service);

-- Faster: grouping on LowCardinality(String)
CREATE TABLE events_fast (
    service    LowCardinality(String),
    event_type LowCardinality(String),
    value      Float64,
    ts         DateTime
) ENGINE = MergeTree() ORDER BY (ts, service);

-- Group-by on LowCardinality is 2-5x faster for typical cardinalities
SELECT service, event_type, count(), avg(value)
FROM events_fast
GROUP BY service, event_type;
```

Use `LowCardinality` for columns with fewer than approximately 10,000 distinct values.

## Pre-Aggregation with AggregatingMergeTree

The biggest aggregation performance win is not query-time optimization but pre-computation: store partially aggregated states and merge them at query time instead of scanning raw rows.

```sql
-- Source table with raw events
CREATE TABLE events_raw
(
    service     LowCardinality(String),
    event_type  LowCardinality(String),
    user_id     UInt64,
    value       Float64,
    ts          DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, service);

-- Pre-aggregated table using AggregatingMergeTree
CREATE TABLE events_hourly_agg
(
    hour        DateTime,
    service     LowCardinality(String),
    event_type  LowCardinality(String),
    event_count AggregateFunction(count),
    value_sum   AggregateFunction(sum,   Float64),
    value_avg   AggregateFunction(avg,   Float64),
    unique_users AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service, event_type);

-- Materialized view that populates the pre-aggregated table
CREATE MATERIALIZED VIEW events_hourly_agg_mv
TO events_hourly_agg
AS
SELECT
    toStartOfHour(ts)    AS hour,
    service,
    event_type,
    countState()         AS event_count,
    sumState(value)      AS value_sum,
    avgState(value)      AS value_avg,
    uniqState(user_id)   AS unique_users
FROM events_raw
GROUP BY hour, service, event_type;
```

Query the pre-aggregated table using merge functions:

```sql
SELECT
    hour,
    service,
    event_type,
    countMerge(event_count)    AS total_events,
    sumMerge(value_sum)        AS total_value,
    avgMerge(value_avg)        AS avg_value,
    uniqMerge(unique_users)    AS distinct_users
FROM events_hourly_agg
WHERE hour >= now() - INTERVAL 7 DAY
GROUP BY hour, service, event_type
ORDER BY hour, total_events DESC;
```

This query reads pre-aggregated hourly buckets rather than billions of raw rows, often delivering 100-1000x speedups.

## Use Approximate Aggregation Functions

Exact aggregations like `uniqExact` and `quantileExact` require storing all values in memory. Approximate equivalents trade a tiny error margin for massive memory and CPU savings.

```sql
-- Exact COUNT DISTINCT: uses O(n) memory, slow
SELECT uniqExact(user_id) FROM events_raw;

-- Approximate: uses O(1) memory, sub-percent error
SELECT uniq(user_id)      FROM events_raw;  -- adaptive sampling, compact state
SELECT uniqHLL12(user_id) FROM events_raw;  -- HLL-based state, ~1.6% typical error

-- Exact quantile: sorts all values, O(n log n)
SELECT quantileExact(0.99)(response_ms) FROM requests;

-- Approximate quantile: reservoir sampling (reservoir size up to 8192)
SELECT quantile(0.99)(response_ms) FROM requests;

-- T-Digest variant: better precision-to-state-size ratio, logarithmic memory
SELECT quantileTDigest(0.99)(response_ms) FROM requests;

-- Multiple quantiles in one pass
SELECT quantiles(0.5, 0.95, 0.99)(response_ms) FROM requests;
```

## Tune GROUP BY with group_by_overflow_mode

When the number of keys in a GROUP BY exceeds memory limits, ClickHouse can spill intermediate state to disk with `max_bytes_before_external_group_by`. `group_by_overflow_mode` is separate: it controls what happens once `max_rows_to_group_by` is hit.

```sql
SET max_bytes_before_external_group_by = 10000000000;  -- 10 GB spill threshold
SET max_rows_to_group_by = 100000;
SET group_by_overflow_mode = 'any';  -- return a partial result once the row cap is hit

SELECT
    user_id,
    count() AS events
FROM events_raw
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by = 10000000000,
    max_rows_to_group_by = 100000,
    group_by_overflow_mode = 'any';
```

## Optimize GROUP BY Key Order

ClickHouse reads data in primary key order. When your GROUP BY keys match the leftmost columns of the ORDER BY and the `optimize_aggregation_in_order` setting is enabled, ClickHouse can finalize intermediate aggregation state incrementally as new keys arrive instead of building up a full hash table first.

```sql
-- ORDER BY (ts, service, event_type)
-- This query groups on (service, event_type) - not in primary key prefix order
-- ClickHouse builds a hash table: slower
SELECT service, event_type, count()
FROM events_raw
GROUP BY service, event_type;

-- This query groups on (service) with a range filter on ts first
-- ClickHouse can partially stream: faster
SELECT service, count()
FROM events_raw
WHERE ts >= today() - 7
GROUP BY service;
```

## Parallelism and Thread Tuning

ClickHouse aggregations are parallelized across CPU cores. Tune the following settings for maximum throughput on large aggregations:

```sql
-- Use all available CPU threads for aggregation
SET max_threads = 16;

-- Enable two-level aggregation (faster for high-cardinality GROUP BY)
-- ClickHouse switches to two-level automatically when group size exceeds threshold
SET group_by_two_level_threshold = 100000;
SET group_by_two_level_threshold_bytes = 50000000;

-- Number of threads used when merging intermediate aggregation results
-- in memory-efficient mode (0 means the value of max_threads is used)
SET aggregation_memory_efficient_merge_threads = 0;
```

Check how many threads were actually used:

```sql
SELECT
    ProfileEvents['RealTimeMicroseconds'] / 1e6 AS wall_time_sec,
    ProfileEvents['UserTimeMicroseconds']  / 1e6 AS cpu_time_sec,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] / 1e6 AS virtual_cpu_sec
FROM system.query_log
WHERE query LIKE '%events_raw%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Materialized Columns for Derived Aggregation Keys

Pre-compute derived GROUP BY keys as materialized columns to avoid repeated computation.

```sql
ALTER TABLE events_raw
    ADD COLUMN event_date Date MATERIALIZED toDate(ts),
    ADD COLUMN event_hour DateTime MATERIALIZED toStartOfHour(ts),
    ADD COLUMN service_type String MATERIALIZED lower(service);

-- Now grouping by event_hour reads a pre-computed column instead of calling toStartOfHour at runtime
SELECT event_hour, count()
FROM events_raw
GROUP BY event_hour
ORDER BY event_hour;
```

## Summary

Aggregation performance in ClickHouse is improved through a layered approach: use `LowCardinality` for low-cardinality group-by columns, pre-aggregate with `AggregatingMergeTree` and materialized views for frequently run queries, replace exact functions with approximate equivalents where a small error is acceptable, align GROUP BY keys with the primary key order, and tune thread and memory settings for large aggregations. The combination of pre-aggregation and approximate functions delivers interactive-speed analytics even on trillion-row tables.
