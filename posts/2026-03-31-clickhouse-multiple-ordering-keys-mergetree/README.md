# How to Use Multiple Ordering Keys in MergeTree Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, ORDER BY, Sorting Key, Multiple Column, Performance, SQL

Description: Learn how to define and optimize multi-column ORDER BY keys in ClickHouse MergeTree tables for efficient filtering, range queries, and deduplication.

---

The `ORDER BY` clause in ClickHouse MergeTree defines the physical sort order of rows on disk and the sparse primary index. Using multiple columns in ORDER BY enables efficient filtering on any prefix of those columns and controls how variant engines like ReplacingMergeTree identify duplicates. Choosing the right column order is one of the most important schema decisions.

## Basic Multi-Column ORDER BY

```sql
CREATE TABLE events (
    ts       DateTime,
    user_id  UInt32,
    event    LowCardinality(String),
    value    Float64
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);
```

Rows are sorted first by `ts`, then by `user_id` within the same timestamp. Queries filtering on `ts` or `(ts, user_id)` are efficient.

## Column Order Matters: Most-Queried First

Put the most-queried column first. Among equally queried columns, prefer lower cardinality first for better compression and index granularity:

```sql
-- Good: ts is the most common filter; user_id is second
ORDER BY (ts, user_id, event)

-- Less efficient: event first means ts-range queries read more data
ORDER BY (event, ts, user_id)
```

## Index Prefix Rule

The primary index covers all columns in ORDER BY. Queries can use the index only for exact matches or ranges on a left prefix:

```sql
ORDER BY (ts, user_id, session_id)

-- Uses index (prefix match on ts)
WHERE ts >= '2026-03-01' AND ts < '2026-04-01'

-- Uses index (prefix match on ts + user_id)
WHERE ts = '2026-03-31 10:00:00' AND user_id = 12345

-- Cannot use primary index efficiently (skips ts)
WHERE user_id = 12345  -- full scan required
```

## Using LowCardinality Columns in ORDER BY

For enum-like columns, LowCardinality compresses well and can be included in ORDER BY:

```sql
CREATE TABLE user_events (
    ts      DateTime,
    user_id UInt64,
    country LowCardinality(String),
    event   LowCardinality(String)
) ENGINE = MergeTree
ORDER BY (ts, country, user_id);
```

## ReplacingMergeTree: ORDER BY as Deduplication Key

In ReplacingMergeTree, the full ORDER BY is the deduplication identity:

```sql
CREATE TABLE user_profiles (
    user_id  UInt64,
    plan     String,
    version  UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;  -- single-column key identifies records uniquely
```

For compound natural keys:

```sql
CREATE TABLE order_items (
    order_id    UInt64,
    item_id     UInt32,
    quantity    UInt16,
    version     UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (order_id, item_id);  -- composite natural key
```

## Checking Sort Efficiency with EXPLAIN

```sql
EXPLAIN indexes=1
SELECT count()
FROM events
WHERE ts >= '2026-03-01' AND ts < '2026-04-01' AND user_id = 42;
```

Look for `PrimaryKey` condition usage in the output. If the primary key covers your filter, you see mark ranges pruned.

## Changing ORDER BY

You can add new columns to the end of an existing ORDER BY using `ALTER TABLE`:

```sql
-- Add event to the end of the existing (ts, user_id) key
ALTER TABLE events MODIFY ORDER BY (ts, user_id, event);
```

The new key must contain all original columns in the same order. You cannot remove columns or reorder them. If you need a completely different key order, recreate the table:

```sql
CREATE TABLE events_v2 (...) ENGINE = MergeTree ORDER BY (user_id, ts, event);
INSERT INTO events_v2 SELECT * FROM events;
```

## Summary

Multi-column ORDER BY keys in MergeTree define both physical sort order and the primary index prefix. Place the most-filtered, highest-cardinality column first. Queries can efficiently skip data only on left-prefix matches of the ORDER BY. In ReplacingMergeTree and SummingMergeTree, the full ORDER BY serves as the deduplication or aggregation key - design it to match your natural primary key semantics.
