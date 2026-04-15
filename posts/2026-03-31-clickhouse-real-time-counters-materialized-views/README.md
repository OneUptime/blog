# How to Build a Real-Time Counters System with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Real-Time Counter, SummingMergeTree, Analytics

Description: Build real-time counters in ClickHouse using materialized views and SummingMergeTree to maintain live event counts without expensive full-table scans.

---

## The Problem with Counting in Real Time

Running `SELECT count() FROM events WHERE type = 'page_view'` on a table with 10 billion rows takes seconds even in ClickHouse. For dashboards that refresh every few seconds, this is unacceptable. Materialized views with SummingMergeTree pre-compute and maintain counters incrementally, so reads are instant.

## Base Events Table

```sql
CREATE TABLE events
(
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt64,
    page_id UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## Create the Materialized View Counter

```sql
-- Target table using SummingMergeTree
CREATE TABLE event_counts
(
    event_date Date,
    event_type LowCardinality(String),
    count UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type);

-- Materialized view that populates it on insert
CREATE MATERIALIZED VIEW event_counts_mv
TO event_counts
AS
SELECT
    toDate(event_time) AS event_date,
    event_type,
    count() AS count
FROM events
GROUP BY event_date, event_type;
```

## Query the Counter

```sql
-- Read current counts - instant, no full scan needed
SELECT
    event_type,
    sum(count) AS total_events
FROM event_counts
WHERE event_date >= today() - 30
GROUP BY event_type
ORDER BY total_events DESC;
```

The `sum(count)` is needed because SummingMergeTree merges happen asynchronously - there may be multiple parts with the same key before merge completes.

## Multi-Granularity Counters

Build counters at multiple time granularities in one view:

```sql
CREATE TABLE event_counts_hourly
(
    event_hour DateTime,
    event_type LowCardinality(String),
    count UInt64
)
ENGINE = SummingMergeTree
ORDER BY (event_hour, event_type);

CREATE MATERIALIZED VIEW event_counts_hourly_mv
TO event_counts_hourly
AS
SELECT
    toStartOfHour(event_time) AS event_hour,
    event_type,
    count() AS count
FROM events
GROUP BY event_hour, event_type;
```

## Live Counter Query Pattern

When you need finer time granularity than the daily counter provides, combine pre-aggregated historical counts with a raw scan for the current day. Exclude today from the materialized view query to avoid double counting, since ClickHouse materialized views populate synchronously on insert:

```sql
SELECT event_type, sum(cnt) AS total
FROM (
    -- From pre-aggregated view (fast, covers completed days)
    SELECT event_type, sum(count) AS cnt
    FROM event_counts
    WHERE event_date >= today() - 30
      AND event_date < today()
    GROUP BY event_type

    UNION ALL

    -- Direct from raw (covers today with full granularity)
    SELECT event_type, count() AS cnt
    FROM events
    WHERE event_time >= toStartOfDay(now())
    GROUP BY event_type
)
GROUP BY event_type;
```

## Summary

Real-time counters in ClickHouse are built with a SummingMergeTree target table and a materialized view that aggregates incoming events at insert time. Reads become instant key-value lookups with a small `sum()` to account for unmerged parts. For sub-minute freshness, union the materialized view with a short window scan of the raw table.
