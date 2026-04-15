# How to Use uniqCombined() and uniqCombined64() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, uniqCombined, Count Distinct

Description: Learn how uniqCombined() uses a hybrid algorithm in ClickHouse for more accurate approximate distinct counts, and when to use uniqCombined64() for large cardinality.

---

ClickHouse's `uniqCombined()` function provides approximate distinct counting using a hybrid algorithm that keeps exact representations for small cardinalities and switches to an approximate sketch as the number of distinct values grows. This adaptive approach gives better accuracy than `uniq()` across a wide range of cardinalities, making it a strong choice when you want more accuracy than the default approximate function.

## Basic Syntax

```sql
-- Approximate distinct count with hybrid algorithm
SELECT uniqCombined(user_id) AS approx_distinct_users
FROM page_views;
```

For large cardinalities (tens of millions of distinct values), use `uniqCombined64()` which uses a 64-bit hash, reducing collision probability:

```sql
-- High-cardinality distinct count with 64-bit hashing
SELECT uniqCombined64(session_uuid) AS approx_distinct_sessions
FROM events;
```

## The Hybrid Algorithm

`uniqCombined()` adapts its internal representation based on the observed cardinality:

- **Array phase**: For very few distinct values (< ~256), values are stored in a compact sorted array. Exact counts, zero overhead.
- **Hash set phase**: For moderate cardinalities, an exact hash set is maintained. Still exact, higher memory.
- **HyperLogLog phase**: When cardinality grows large, the state transitions to HLL with 17-bit precision (131,072 registers).

```sql
-- The function automatically picks the right structure internally
-- No configuration needed from the user
SELECT uniqCombined(ip_address) AS unique_ips
FROM access_logs
WHERE event_date = today();
```

## uniqCombined() vs uniq()

`uniq()` is the recommended approximate distinct-count function for most scenarios. `uniqCombined()` uses a larger internal sketch for better accuracy on higher-cardinality datasets:

```sql
-- Compare accuracy of uniq vs uniqCombined
SELECT
    uniq(user_id)         AS hll_approx,
    uniqCombined(user_id) AS combined_approx,
    uniqExact(user_id)    AS exact
FROM user_events
WHERE event_date = today();
```

Typical error rates:
- `uniq()`: small relative error, optimized for speed
- `uniqCombined()`: lower relative error than `uniq()` on large cardinalities
- `uniqExact()`: 0% error

## uniqCombined64() for Very High Cardinality

`uniqCombined()` uses 32-bit hashes for non-String types and 64-bit hashes for String types, which can introduce hash collisions for non-String columns with billions of distinct values. `uniqCombined64()` uses 64-bit hashes for all data types to avoid this:

```sql
-- For datasets with hundreds of millions of distinct values
SELECT uniqCombined64(raw_event_id) AS approx_events
FROM event_stream
WHERE event_date >= today() - 30;
```

Use `uniqCombined64()` when your distinct count on non-String columns could approach billions of unique values, as hash collisions in the 32-bit version become significant near UINT_MAX (~4.3 billion).

## Grouping Example

```sql
-- Daily unique users and sessions with high accuracy
SELECT
    toDate(event_time)     AS date,
    platform,
    uniqCombined(user_id)     AS dau,
    uniqCombined(session_id)  AS daily_sessions
FROM user_events
WHERE event_date >= today() - 14
GROUP BY date, platform
ORDER BY date DESC, dau DESC;
```

## Using in Materialized Views

```sql
-- Incremental combined state in a materialized view
CREATE MATERIALIZED VIEW dau_combined_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, app_version)
AS
SELECT
    toDate(event_time)         AS date,
    app_version,
    uniqCombinedState(user_id) AS users_state
FROM user_events
GROUP BY date, app_version;

-- Query merged state
SELECT
    date,
    app_version,
    uniqCombinedMerge(users_state) AS dau
FROM dau_combined_mv
GROUP BY date, app_version
ORDER BY date DESC;
```

For `uniqCombined64()`, use `uniqCombined64State()` and `uniqCombined64Merge()`.

## When to Choose Each Function

```sql
-- Quick reference: function selection guide

-- Use uniqExact() when: billing, compliance, small dataset
SELECT uniqExact(customer_id) AS paying_users FROM subscriptions;

-- Use uniqCombined() when: general analytics, default choice
SELECT uniqCombined(user_id) AS dau FROM events WHERE event_date = today();

-- Use uniqCombined64() when: very high cardinality (billions of distinct values on non-String columns)
SELECT uniqCombined64(raw_id) AS approx_events FROM huge_table;

-- Use uniq() when: legacy code, marginal performance needed, accuracy less critical
SELECT uniq(user_id) AS rough_dau FROM events WHERE event_date = today();
```

## Summary

`uniqCombined()` is a good approximate distinct-count option in ClickHouse when you want better accuracy than `uniq()` without paying for exact counting. Use `uniqCombined64()` when working with very large cardinalities where 32-bit hash collisions could skew results. Reserve `uniqExact()` for scenarios where a precise count is mandatory, such as billing and compliance reports.
