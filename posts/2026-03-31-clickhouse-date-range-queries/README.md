# How to Optimize Date Range Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to design ClickHouse schemas and write queries that maximize primary key pruning and partition elimination for fast date range filtering.

## Introduction

Date range queries are the most common filter in analytical workloads. "Show me the last 7 days of events" or "aggregate metrics for Q3 2024" are patterns that run hundreds of times per minute on busy analytics platforms. ClickHouse's performance on these queries depends almost entirely on how well your schema is designed to prune granules and partitions. A well-tuned schema can reduce the data read from terabytes to megabytes for the same query.

## How ClickHouse Eliminates Data for Date Filters

ClickHouse uses three layers of elimination:

1. **Partition pruning** - skips entire partitions (directories on disk) when the partition key does not match the `WHERE` clause.
2. **Primary key (sparse index) pruning** - skips granules within a part when the primary key range cannot satisfy the filter.
3. **Skipping indexes** - additional secondary indexes (minmax, bloom filters) that can skip granules not covered by the primary key.

For date range queries, the first two layers are the most important.

## Optimal Schema Design for Date Ranges

Always put the date or datetime column first in `ORDER BY` when time-series filtering is the dominant query pattern.

```sql
-- Good: event_time is the leftmost ORDER BY key
-- ClickHouse builds sparse index ranges over event_time
CREATE TABLE server_metrics
(
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value       Float64,
    event_time  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, host, metric_name);

-- Less good for time-range queries: event_time is not the leftmost key
-- Filtering on event_time requires scanning all granules
CREATE TABLE server_metrics_bad
(
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value       Float64,
    event_time  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (host, metric_name, event_time);
```

## Writing Efficient Date Range Queries

### Use Partition Key in WHERE

Always include the partition key column in the `WHERE` clause so ClickHouse can skip irrelevant partitions.

```sql
-- Efficient: uses partition key (toYYYYMM) and primary key (event_time)
SELECT
    host,
    metric_name,
    avg(value)
FROM server_metrics
WHERE event_time >= '2024-09-01 00:00:00'
  AND event_time <  '2024-10-01 00:00:00'
GROUP BY host, metric_name;

-- Also efficient: ClickHouse evaluates toYYYYMM(event_time) against the partition key
SELECT count()
FROM server_metrics
WHERE toYYYYMM(event_time) = 202409;
```

### Use Half-Open Intervals

Use `>=` and `<` (not `BETWEEN`) for date ranges. This avoids edge case ambiguity at midnight boundaries.

```sql
-- Preferred: half-open interval, unambiguous at day boundaries
SELECT count()
FROM server_metrics
WHERE event_time >= toDateTime('2024-09-01')
  AND event_time <  toDateTime('2024-10-01');

-- Less preferred: BETWEEN includes both endpoints
-- On DateTime, 2024-09-30 23:59:59 and 2024-10-01 00:00:00 both match
SELECT count()
FROM server_metrics
WHERE event_time BETWEEN '2024-09-01' AND '2024-09-30 23:59:59';
```

### Use today() and now() for Rolling Windows

ClickHouse folds constant expressions, so `today() - 7` is computed once at planning time.

```sql
-- Last 7 days
SELECT date, count()
FROM server_metrics
WHERE event_time >= toDateTime(today() - 7)
  AND event_time <  toDateTime(today() + 1)
GROUP BY toDate(event_time) AS date
ORDER BY date;

-- Last 24 hours
SELECT toStartOfHour(event_time) AS hour, avg(value)
FROM server_metrics
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Checking Partition and Granule Pruning

Use `EXPLAIN` to verify that partition and granule elimination is working.

```sql
EXPLAIN indexes = 1
SELECT count()
FROM server_metrics
WHERE event_time >= '2024-09-01'
  AND event_time <  '2024-10-01';
```

Look for `Granules: X/Y` in the output. If X is much smaller than Y, pruning is effective.

```sql
-- View partition elimination in system.query_log after query runs
SELECT
    query,
    read_rows,
    read_bytes,
    ProfileEvents['SelectedParts']          AS parts_read,
    ProfileEvents['SelectedRanges']         AS ranges_read,
    ProfileEvents['SelectedMarks']          AS granules_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%server_metrics%'
ORDER BY event_time DESC
LIMIT 3;
```

## Using Minmax Skipping Indexes for Sub-Partition Granularity

If your partition is monthly but you frequently filter on specific days, add a minmax skipping index on the date column for finer granule skipping.

```sql
ALTER TABLE server_metrics
    ADD INDEX idx_event_date (toDate(event_time)) TYPE minmax GRANULARITY 4;

-- Materialize the index on existing data
ALTER TABLE server_metrics MATERIALIZE INDEX idx_event_date;

-- Queries filtering by date now benefit from both partition and minmax elimination
SELECT count()
FROM server_metrics
WHERE event_time >= '2024-09-15'
  AND event_time <  '2024-09-16';
```

## Partitioning Strategy by Query Granularity

Choose your partition key based on how far back your typical queries look:

```sql
-- For queries that rarely go back more than a month: partition by day
PARTITION BY toDate(event_time)

-- For queries spanning months: partition by month (most common)
PARTITION BY toYYYYMM(event_time)

-- For queries spanning years: partition by year
PARTITION BY toYear(event_time)

-- For multi-tenant systems filtering on both tenant and time: composite partition
PARTITION BY (tenant_id, toYYYYMM(event_time))
```

Avoid partitioning too finely (daily partitions on a table with years of history creates millions of small parts, which degrades performance).

## Accelerating Aggregations Over Time Ranges

For dashboards that repeatedly aggregate the same time windows, use a materialized view with a time-bucket summary.

```sql
-- Daily summary table. Use AggregatingMergeTree so avg/max/count merge
-- correctly as rows for the same (day, host, metric_name) are combined.
CREATE TABLE server_metrics_daily
(
    day         Date,
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value_avg    AggregateFunction(avg, Float64),
    value_max    SimpleAggregateFunction(max, Float64),
    sample_count SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, host, metric_name);

CREATE MATERIALIZED VIEW server_metrics_daily_mv
TO server_metrics_daily
AS
SELECT
    toDate(event_time) AS day,
    host,
    metric_name,
    avgState(value)    AS value_avg,
    max(value)         AS value_max,
    count()            AS sample_count
FROM server_metrics
GROUP BY day, host, metric_name;

-- Dashboard query on pre-aggregated daily data: extremely fast
SELECT
    day,
    host,
    avgMerge(value_avg) AS avg_value,
    max(value_max)      AS peak_value
FROM server_metrics_daily
WHERE day >= today() - 30
GROUP BY day, host
ORDER BY day, host;
```

## Summary

Fast date range queries in ClickHouse require four things working together: a `PARTITION BY` expression on a date/datetime column that matches your query granularity, a datetime column as the leftmost `ORDER BY` key, half-open interval filters (`>=` and `<`) that cooperate cleanly with the sparse index, and pre-aggregated materialized views for recurring dashboard queries. Adding a minmax skipping index on the date expression bridges the gap between monthly partitions and daily query patterns.
