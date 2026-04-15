# How to Optimize DISTINCT Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distinct, Query Optimization, uniq, Approximation, Performance

Description: Learn how to optimize DISTINCT queries in ClickHouse by replacing them with approximate functions, pre-aggregation, and efficient query patterns.

---

`SELECT DISTINCT` in ClickHouse is often a sign of a query that can be rewritten more efficiently. Because ClickHouse stores data in column-oriented format and merges sorted parts, deduplication at query time is expensive. This guide shows practical alternatives.

## Why DISTINCT is Expensive

`SELECT DISTINCT` forces ClickHouse to build a hash set of every unique row combination. For high-cardinality columns or large result sets this is memory-intensive and slow.

```sql
-- Expensive: full hash set of all unique user_ids
SELECT DISTINCT user_id FROM events WHERE event_time >= today() - 30;
```

## Use uniq Instead of COUNT(DISTINCT)

`COUNT(DISTINCT col)` internally calls `uniqExact` by default (configurable via the `count_distinct_implementation` setting), which is exact but slow. Use `uniq` for approximate counts (1-2% error, 10-100x faster):

```sql
-- Exact but slow
SELECT count(DISTINCT user_id) FROM events;

-- Approximate but very fast
SELECT uniq(user_id) FROM events;

-- Tunable precision (HLL_precision parameter, range 12-20, default 17)
SELECT uniqCombined(12)(user_id) FROM events;
```

## Use uniqExact Only When Precision is Required

```sql
SELECT date, uniqExact(user_id) AS dau
FROM events
GROUP BY date
ORDER BY date;
```

## Replace DISTINCT with GROUP BY When Aggregating

When you need aggregations alongside deduplication, `GROUP BY` is the better choice because it combines both operations. Note that for simple deduplication without aggregation, `DISTINCT` can actually stream results and terminate early with `LIMIT`, so it is not always slower:

```sql
-- Use GROUP BY when you also need aggregations
SELECT user_id, country, count() AS event_count
FROM events
GROUP BY user_id, country;
```

## Pre-aggregate Unique Counts with AggregatingMergeTree

For daily active user counts that are queried repeatedly, maintain a materialized view:

```sql
CREATE TABLE dau_state (
    date   Date,
    users  AggregateFunction(uniq, UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY date;

CREATE MATERIALIZED VIEW dau_mv TO dau_state AS
SELECT toDate(event_time) AS date, uniqState(user_id) AS users
FROM events
GROUP BY date;
```

```sql
-- Lightning-fast DAU query
SELECT date, uniqMerge(users) AS dau
FROM dau_state
GROUP BY date
ORDER BY date;
```

## Use LIMIT with DISTINCT to Exit Early

If you only need to know whether duplicates exist or want a sample:

```sql
SELECT DISTINCT user_id FROM events LIMIT 1000;
```

ClickHouse can stop processing once 1000 distinct values are found. Note that this early termination only works when `ORDER BY` is omitted. Adding `ORDER BY` forces ClickHouse to process all data first.

## Avoid DISTINCT on Wide Rows

If your DISTINCT covers many columns, consider whether you truly need all columns or can group on a key:

```sql
-- Instead of selecting all columns distinct
SELECT DISTINCT session_id FROM events WHERE event_type = 'start';
```

Then join back if you need additional fields.

## Summary

Optimizing DISTINCT queries in ClickHouse usually means replacing `COUNT(DISTINCT)` with `uniq`, using `GROUP BY` when you need aggregations alongside deduplication, and pre-aggregating cardinality metrics with `AggregatingMergeTree` materialized views. Reserve `uniqExact` only when you need bit-perfect counts and can tolerate the memory cost.
