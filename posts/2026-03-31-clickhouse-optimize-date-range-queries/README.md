# How to Optimize ClickHouse Date Range Scan Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Range, Query Optimization, Partition Pruning, MergeTree

Description: Learn how to optimize ClickHouse date range queries using partition pruning, primary key alignment, and efficient date functions to minimize IO.

---

Date range queries are among the most common patterns in analytical databases. ClickHouse provides multiple layers of optimization for time-based filtering when the table is designed correctly.

## Partition Pruning

When partitioned by date, ClickHouse reads only relevant partitions:

```sql
CREATE TABLE events (
    ts         DateTime,
    user_id    String,
    event_type LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts);
```

A query like:

```sql
SELECT count() FROM events WHERE ts >= '2026-01-01' AND ts < '2026-02-01';
```

reads only the `202601` partition, skipping all others entirely.

## Verifying Partition Pruning

```sql
EXPLAIN
SELECT count() FROM events WHERE ts >= '2026-01-01' AND ts < '2026-02-01';
```

Look for `Partitions: 1/N` to confirm pruning is active.

## Align ts with Primary Key

Include `ts` early in the ORDER BY key so range scans can leverage the primary index:

```sql
ORDER BY (project_id, ts)
-- Queries filtering by project_id AND ts range are very efficient
```

## Use today() and now() for Rolling Windows

```sql
-- Last 7 days
SELECT count() FROM events WHERE ts >= today() - 7;

-- Last hour
SELECT count() FROM events WHERE ts >= now() - INTERVAL 1 HOUR;
```

## Use toStartOf* Functions for Grouping

```sql
SELECT
    toStartOfHour(ts) AS hour,
    count() AS events
FROM events
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

`toStartOfHour`, `toStartOfDay`, `toStartOfMonth` are vectorized and efficient.

## Avoid Wrapping ts in Functions in WHERE

```sql
-- Slow: function on ts prevents index use
WHERE toDate(ts) = '2026-01-15'

-- Fast: range condition allows index + partition pruning
WHERE ts >= '2026-01-15' AND ts < '2026-01-16'
```

## Date Arithmetic Patterns

```sql
-- This month
WHERE ts >= toStartOfMonth(now()) AND ts < toStartOfMonth(now()) + INTERVAL 1 MONTH

-- Specific week
WHERE ts >= toMonday('2026-01-06') AND ts < toMonday('2026-01-06') + INTERVAL 7 DAY
```

## Using minmax Index on ts

When `ts` is not the primary key, add a minmax skipping index:

```sql
ALTER TABLE events ADD INDEX idx_ts_minmax (ts) TYPE minmax GRANULARITY 1;
ALTER TABLE events MATERIALIZE INDEX idx_ts_minmax;
```

## Summary

Optimizing date range queries in ClickHouse requires partitioning by date, aligning the timestamp with the ORDER BY key, using range conditions instead of function-wrapped timestamps, and leveraging partition pruning. Together these can reduce scan time by 10-100x.
