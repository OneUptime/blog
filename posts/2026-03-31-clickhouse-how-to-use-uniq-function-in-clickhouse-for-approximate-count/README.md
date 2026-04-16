# How to Use uniq() Function in ClickHouse for Approximate Count Distinct

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cardinality, Distinct Count, Analytics, HyperLogLog

Description: Learn how to use uniq() and related functions in ClickHouse for fast approximate count distinct, including exact and HyperLogLog-based variants.

---

## Overview

ClickHouse provides `uniq()` and a family of related functions for counting distinct values. `uniq()` is the default approximate function, `uniqHLL12()` is HyperLogLog-based, and `uniqCombined()` mixes strategies depending on cardinality. They are much faster and more memory-efficient than `count(DISTINCT ...)` for large datasets.

## Basic uniq()

```sql
SELECT uniq(user_id) AS distinct_users
FROM page_views
WHERE event_date = today();
```

`uniq()` returns an approximate count with about 2.2% error rate.

## uniq() vs count(DISTINCT)

```sql
-- Exact but slow for large tables
SELECT count(DISTINCT user_id) FROM events;

-- Approximate but fast, low memory
SELECT uniq(user_id) FROM events;
```

For analytics dashboards with millions of rows, `uniq()` is significantly faster.

## uniqExact() for Exact Counts

When you need exact results:

```sql
SELECT uniqExact(session_id) AS exact_sessions
FROM access_log
WHERE endpoint = '/checkout';
```

Note: `uniqExact()` uses more memory and is slower than `uniq()`.

## uniqHLL12() - HyperLogLog Variant

`uniqHLL12()` uses HyperLogLog with 2^12 cells and a state size of about 2.5 KB:

```sql
SELECT uniqHLL12(user_id) AS approx_users
FROM page_views;
```

Note: ClickHouse does not recommend this function in most cases — `uniq` or `uniqCombined` typically deliver better accuracy. `uniqHLL12()` error is up to ~10% for small cardinalities (<10K distinct values) and grows again for very large sets (>100M).

## uniqCombined() - Best Default

`uniqCombined()` combines array, hash set, and HyperLogLog approaches - it automatically picks the right structure based on cardinality:

```sql
SELECT uniqCombined(user_id) AS users
FROM events
GROUP BY country;
```

This is generally the recommended variant for most use cases.

## Grouping by Dimension

```sql
SELECT
    toDate(event_time) AS date,
    uniq(user_id)      AS daily_active_users,
    uniq(session_id)   AS sessions
FROM page_views
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

## Using with -If Combinator

Count distinct values conditionally:

```sql
SELECT
    uniqIf(user_id, event_type = 'purchase')  AS buyers,
    uniqIf(user_id, event_type = 'page_view') AS viewers
FROM events
WHERE event_date = today();
```

## Funnel Analysis Example

```sql
SELECT
    uniq(user_id)                                          AS total_visitors,
    uniqIf(user_id, step >= 1)                             AS viewed_product,
    uniqIf(user_id, step >= 2)                             AS added_to_cart,
    uniqIf(user_id, step >= 3)                             AS purchased
FROM funnel_events
WHERE event_date = today();
```

## State and Merge for Materialized Views

For incremental counting, use `uniqState()` and `uniqMerge()`:

```sql
-- Materialized view storing state
CREATE MATERIALIZED VIEW daily_uniq_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, country)
AS
SELECT
    toDate(event_time) AS date,
    country,
    uniqState(user_id) AS user_state
FROM events
GROUP BY date, country;

-- Query merging states
SELECT
    date,
    country,
    uniqMerge(user_state) AS distinct_users
FROM daily_uniq_mv
GROUP BY date, country;
```

## Summary

`uniq()` and its variants provide efficient approximate or exact distinct counting in ClickHouse. Use `uniq()` for fast approximate counts, `uniqExact()` for precision, and `uniqCombined()` as a smart default that adapts to cardinality. Pair with `uniqState()`/`uniqMerge()` for efficient materialized view patterns.
