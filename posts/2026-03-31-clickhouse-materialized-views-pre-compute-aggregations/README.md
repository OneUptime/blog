# How to Use Materialized Views to Pre-Compute Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Aggregation, Performance, SummingMergeTree, AggregatingMergeTree

Description: Learn how to use ClickHouse materialized views to pre-compute and incrementally maintain aggregations for fast dashboard and reporting queries.

---

Materialized views in ClickHouse are one of the most powerful tools for query acceleration. They incrementally maintain aggregated results as new data arrives, so your dashboards query pre-computed summaries instead of scanning raw data.

## How Materialized Views Work

When a row is inserted into the source table, ClickHouse automatically runs the materialized view query on the new data and writes the result to the target table. On read, you query the target table directly for instant aggregated results.

## Setting Up a Counting Aggregation

Count events by type and date:

```sql
-- Source table (raw events)
CREATE TABLE events (
    event_id UInt64,
    event_type LowCardinality(String),
    user_id UInt64,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- Target table using SummingMergeTree
CREATE TABLE events_by_type_daily (
    event_date Date,
    event_type LowCardinality(String),
    event_count UInt64
) ENGINE = SummingMergeTree(event_count)
ORDER BY (event_date, event_type);

-- Materialized view to populate the target
CREATE MATERIALIZED VIEW events_by_type_daily_mv
TO events_by_type_daily
AS SELECT
    toDate(event_time) AS event_date,
    event_type,
    count() AS event_count
FROM events
GROUP BY event_date, event_type;
```

## Backfilling Historical Data

After creating the view, populate it with existing data:

```sql
INSERT INTO events_by_type_daily
SELECT
    toDate(event_time) AS event_date,
    event_type,
    count() AS event_count
FROM events
GROUP BY event_date, event_type;
```

## Querying the Materialized View

```sql
-- Fast: reads from pre-aggregated table
SELECT
    event_date,
    event_type,
    sum(event_count) AS total_events
FROM events_by_type_daily
WHERE event_date >= today() - 30
GROUP BY event_date, event_type
ORDER BY event_date, event_type;
```

## Using AggregatingMergeTree for Complex Aggregations

For more complex aggregates (percentiles, uniq counts), use `AggregatingMergeTree`:

```sql
-- Target table with aggregate states
CREATE TABLE user_metrics_hourly (
    event_hour DateTime,
    country LowCardinality(String),
    unique_users AggregateFunction(uniq, UInt64),
    avg_session_ms AggregateFunction(avg, Float64)
) ENGINE = AggregatingMergeTree()
ORDER BY (event_hour, country);

-- Materialized view using -State combinators
CREATE MATERIALIZED VIEW user_metrics_hourly_mv
TO user_metrics_hourly
AS SELECT
    toStartOfHour(event_time) AS event_hour,
    country,
    uniqState(user_id) AS unique_users,
    avgState(session_duration_ms) AS avg_session_ms
FROM events
GROUP BY event_hour, country;

-- Query using -Merge combinators
SELECT
    event_hour,
    country,
    uniqMerge(unique_users) AS unique_users,
    avgMerge(avg_session_ms) AS avg_session_ms
FROM user_metrics_hourly
GROUP BY event_hour, country
ORDER BY event_hour;
```

## Chaining Materialized Views

Pre-aggregate at multiple granularities by chaining views:

```sql
-- Hourly summary -> daily summary
CREATE TABLE events_daily AS events_hourly;  -- same schema

CREATE MATERIALIZED VIEW events_daily_mv
TO events_daily
AS SELECT
    toDate(event_hour) AS event_date,
    event_type,
    sum(event_count) AS event_count
FROM events_hourly
GROUP BY event_date, event_type;
```

## Monitoring Materialized View Health

Check that the view is current with the source:

```sql
-- Compare counts
SELECT count() FROM events WHERE event_time >= today() - 1;
SELECT sum(event_count) FROM events_by_type_daily WHERE event_date >= today() - 1;

-- Check for view insertion errors in the query log
SELECT event_time, query, exception
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND query LIKE '%events_by_type_daily%'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

Materialized views in ClickHouse pre-compute aggregations incrementally, dramatically reducing query latency for dashboards and reports. Use `SummingMergeTree` for simple counts and sums, `AggregatingMergeTree` with state combinators for complex aggregates, and chain views across granularities to support multiple time resolutions from a single source of truth.
