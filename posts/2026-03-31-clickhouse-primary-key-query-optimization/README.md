# How to Optimize ClickHouse Queries Using Primary Key Structure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Primary Key, Query Optimization, MergeTree, Index

Description: Learn how ClickHouse's primary key and sparse index structure work, and how to design ORDER BY keys and queries to maximize index granule skipping.

---

ClickHouse's primary key is a sparse index built from the ORDER BY key. Understanding how it works at the granule level is essential for writing queries that skip as much data as possible.

## How the Primary Key Works

ClickHouse stores data sorted by the ORDER BY key and maintains a sparse index with one entry per 8192 rows (default `index_granularity`). Each entry stores the primary key column values of the first row in that granule.

```sql
CREATE TABLE events (
    ts          DateTime,
    project_id  UInt64,
    user_id     String,
    event_type  LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (project_id, ts)
PARTITION BY toYYYYMM(ts);
```

## Queries That Use the Index Effectively

A query that filters on the leading primary key columns can skip granules:

```sql
-- Uses index: project_id is the first key
SELECT count() FROM events WHERE project_id = 42;

-- Uses index: both leading columns used
SELECT count() FROM events WHERE project_id = 42 AND ts > '2026-01-01';
```

## Queries That Skip the Index

```sql
-- Cannot use index - user_id is not in ORDER BY
SELECT count() FROM events WHERE user_id = 'abc123';

-- Cannot skip granules - ts without project_id means all granules must be checked
SELECT count() FROM events WHERE ts > '2026-01-01';
```

## Checking Granule Skipping

```sql
EXPLAIN indexes = 1
SELECT count() FROM events WHERE project_id = 42;
```

Look for `Granules: N/M` in the output to see how many granules were skipped.

## Designing the ORDER BY Key

Put the most commonly filtered column first:

```sql
-- Good: project_id is always in WHERE clauses
ORDER BY (project_id, ts)

-- Less good if most queries filter by user_id
ORDER BY (ts, project_id)
```

The first key column provides the most selective index skipping.

## Cardinality Ordering

Low-cardinality columns before high-cardinality improves compression but may reduce index efficiency:

```sql
-- For queries that always filter by project_id (low cardinality) then narrow by ts:
ORDER BY (project_id, ts)

-- For queries that filter by user_id (high cardinality):
ORDER BY (user_id, ts)
-- Creates a large primary index but allows direct lookups
```

## Using system.parts to Check Index Density

```sql
SELECT
    name,
    rows,
    marks,
    rows / marks AS rows_per_granule
FROM system.parts
WHERE table = 'events' AND active;
```

## Summary

ClickHouse's sparse primary key enables granule-skipping IO reduction when queries filter on leading ORDER BY columns. Design your ORDER BY to match the most common query patterns and verify with `EXPLAIN indexes = 1`.
