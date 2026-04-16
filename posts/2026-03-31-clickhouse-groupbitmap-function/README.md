# How to Use groupBitmap() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, groupBitmap, Bitmap

Description: Learn how to build and operate on Roaring Bitmaps in ClickHouse using groupBitmap(), bitmapCardinality(), and bitmap set operations.

---

`groupBitmap()` is a ClickHouse aggregate function that computes the number of distinct unsigned integers in a column by building a Roaring Bitmap internally and returning its cardinality as a `UInt64`. Its `-State` combinator variant, `groupBitmapState()`, returns the bitmap itself so you can feed it to other bitmap functions. Roaring Bitmaps are compressed bitsets that support extremely fast cardinality counts and set operations (AND, OR, XOR, ANDNOT). When you need to count distinct users, compute cohort overlaps, or perform funnel analysis over hundreds of millions of IDs, `groupBitmap()` with bitmap operations is often 10-100x faster than `COUNT(DISTINCT ...)` or set-based subqueries.

## Syntax and Storage Type

```sql
-- Count distinct user IDs at query time (returns a UInt64)
SELECT groupBitmap(user_id) AS distinct_users FROM events;

-- Get the bitmap itself using the -State combinator
SELECT groupBitmapState(user_id) AS bm FROM events;

-- Store a pre-aggregated bitmap in a table
CREATE TABLE user_cohorts
(
    cohort_name  String,
    event_date   Date,
    user_bitmap  AggregateFunction(groupBitmap, UInt32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (cohort_name, event_date);
```

The storage type `AggregateFunction(groupBitmap, UInt32)` holds the serialized bitmap. Use `UInt32` or `UInt64` depending on your ID range. ClickHouse does not support signed integer types in bitmaps.

## Building a Bitmap and Counting Cardinality

```sql
-- Count distinct users without a pre-aggregated table
SELECT
    event_type,
    groupBitmap(user_id) AS distinct_users
FROM events
WHERE event_date >= today() - 30
GROUP BY event_type;
```

`groupBitmap()` returns the number of bits set in the bitmap it builds internally, equivalent to `COUNT(DISTINCT user_id)` but often faster for large groups. If you already have a bitmap value, `bitmapCardinality()` gives you the same count from it.

## Pre-aggregating Bitmaps with AggregatingMergeTree

For dashboards that run the same distinct count repeatedly, pre-aggregate bitmaps into a materialized table.

```sql
CREATE TABLE daily_active_users
(
    event_date  Date,
    product_id  UInt32,
    user_bitmap AggregateFunction(groupBitmap, UInt32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (event_date, product_id);

-- Populate with an INSERT SELECT
INSERT INTO daily_active_users
SELECT
    event_date,
    product_id,
    groupBitmapState(user_id) AS user_bitmap
FROM events
GROUP BY event_date, product_id;
```

Use `groupBitmapState()` (the `-State` combinator) when writing to an `AggregateFunction` column. Use `groupBitmapMerge()` (the `-Merge` combinator) when reading back.

```sql
-- Query the pre-aggregated table
SELECT
    event_date,
    product_id,
    bitmapCardinality(groupBitmapMerge(user_bitmap)) AS dau
FROM daily_active_users
WHERE event_date >= today() - 7
GROUP BY event_date, product_id
ORDER BY event_date, product_id;
```

## Bitmap Set Operations

ClickHouse provides scalar functions to combine bitmaps and compute set-based metrics.

Because bitmap functions like `bitmapAnd`, `bitmapOr`, and `bitmapAndnot` operate on bitmap values (not counts), use `groupBitmapState()` in subqueries that feed them.

```sql
-- Users who did event A AND event B (intersection / retention)
SELECT bitmapCardinality(
    bitmapAnd(
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'signup'),
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'purchase')
    )
) AS signed_up_and_purchased;
```

```sql
-- Users who did event A OR event B (union / reach)
SELECT bitmapCardinality(
    bitmapOr(
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'ios_open'),
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'web_open')
    )
) AS total_reach;
```

```sql
-- Users in A but NOT in B (churn or non-converters)
SELECT bitmapCardinality(
    bitmapAndnot(
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'trial_start'),
        (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'subscription')
    )
) AS trials_that_did_not_convert;
```

## Multi-day Retention with Pre-aggregated Bitmaps

```sql
-- Day-7 retention: users active on day 0 who returned on day 7
SELECT
    d0.event_date AS cohort_date,
    bitmapCardinality(d0.user_bitmap) AS cohort_size,
    bitmapCardinality(bitmapAnd(d0.user_bitmap, d7.user_bitmap)) AS retained_day7,
    round(
        bitmapCardinality(bitmapAnd(d0.user_bitmap, d7.user_bitmap)) * 100.0
        / bitmapCardinality(d0.user_bitmap),
        2
    ) AS retention_pct
FROM
(
    SELECT event_date, groupBitmapMerge(user_bitmap) AS user_bitmap
    FROM daily_active_users
    GROUP BY event_date
) AS d0
JOIN
(
    SELECT event_date, groupBitmapMerge(user_bitmap) AS user_bitmap
    FROM daily_active_users
    GROUP BY event_date
) AS d7 ON d0.event_date + 7 = d7.event_date
ORDER BY cohort_date;
```

## Converting a Bitmap Back to an Array

When you need to inspect individual IDs in a bitmap, use `bitmapToArray`.

```sql
SELECT bitmapToArray(
    (SELECT groupBitmapState(user_id) FROM events WHERE event_type = 'vip_signup')
) AS vip_user_ids;
```

## Summary

`groupBitmap()` builds memory-efficient Roaring Bitmaps from integer IDs, enabling fast distinct counts with `bitmapCardinality()` and powerful set operations with `bitmapAnd`, `bitmapOr`, `bitmapAndnot`, and `bitmapXor`. Pre-aggregating bitmaps into `AggregatingMergeTree` tables using the `groupBitmapState` and `groupBitmapMerge` combinators transforms expensive real-time distinct counts into sub-second lookups, making cohort analysis and retention queries practical at massive scale.
