# How to Use bitmapCardinality() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Analytics, Counting, Query Optimization

Description: Learn how bitmapCardinality() counts distinct elements in a Roaring Bitmap in ClickHouse, enabling fast unique-user counts and segment-size calculations without full scans.

---

`bitmapCardinality(bitmap)` returns a `UInt64` count of the distinct elements stored in a Roaring Bitmap. It is the bitmap equivalent of `uniqExact()` on a raw column, but it operates on an already-aggregated `AggregateFunction(groupBitmap, UInt64)` value instead of raw rows. Because the cardinality is derived directly from the compressed bitmap structure, it is extremely fast regardless of how many IDs the bitmap holds.

## Creating a Bitmap Table

```sql
CREATE TABLE audience_bitmaps
(
    segment     String,
    day         Date,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (segment, day);
```

```sql
-- Populate with synthetic user data
INSERT INTO audience_bitmaps
SELECT segment, day, groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT 'active'    AS segment, toDate('2024-06-01') AS day, number AS user_id
    FROM numbers(1, 10000)
    UNION ALL
    SELECT 'active'    AS segment, toDate('2024-06-02') AS day, number AS user_id
    FROM numbers(5001, 8000)
    UNION ALL
    SELECT 'churned'   AS segment, toDate('2024-06-01') AS day, number AS user_id
    FROM numbers(9001, 2000)
    UNION ALL
    SELECT 'new_signup' AS segment, toDate('2024-06-02') AS day, number AS user_id
    FROM numbers(15001, 3000)
)
GROUP BY segment, day;
```

## Basic Cardinality Query

```sql
-- Count of distinct users in each segment per day
SELECT
    segment,
    day,
    bitmapCardinality(user_bitmap) AS user_count
FROM audience_bitmaps
ORDER BY segment, day;
```

```text
segment     day         user_count
active      2024-06-01  10000
active      2024-06-02  8000
churned     2024-06-01  2000
new_signup  2024-06-02  3000
```

## Cardinality After Set Operations

Wrap `bitmapCardinality` around any bitmap operation to count the result without materializing an ID array.

```sql
-- How many users were active on both days?
SELECT
    bitmapCardinality(
        bitmapAnd(
            (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-01'),
            (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-02')
        )
    ) AS retained_users;
```

```text
retained_users
5000
```

```sql
-- Total unique users across both active days
SELECT
    bitmapCardinality(
        bitmapOr(
            (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-01'),
            (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-02')
        )
    ) AS total_unique_active;
```

## Dedicated Cardinality Shortcuts

ClickHouse provides combined functions that compute cardinality of an operation result in one call, avoiding intermediate bitmap construction.

```sql
WITH
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active'  AND day = '2024-06-01') AS bm1,
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active'  AND day = '2024-06-02') AS bm2
SELECT
    bitmapAndCardinality(bm1, bm2)    AS and_cardinality,
    bitmapOrCardinality(bm1, bm2)     AS or_cardinality,
    bitmapXorCardinality(bm1, bm2)    AS xor_cardinality,
    bitmapAndnotCardinality(bm1, bm2) AS andnot_cardinality;
```

```text
and_cardinality  or_cardinality  xor_cardinality  andnot_cardinality
5000             13000           8000             5000
```

## Using groupBitmapOrState to Collapse Multiple Rows

Combine `groupBitmapOrState` with `bitmapCardinality` to count unique users across all rows matching a filter.

```sql
-- Total unique active users across all days (merged bitmap)
SELECT
    bitmapCardinality(groupBitmapOrState(user_bitmap)) AS total_unique_active
FROM audience_bitmaps
WHERE segment = 'active';
```

```text
total_unique_active
13000
```

## Daily Segment Size Trend

```sql
-- Daily size of each segment, ordered by day
SELECT
    day,
    segment,
    bitmapCardinality(user_bitmap) AS segment_size
FROM audience_bitmaps
ORDER BY day, segment;
```

## Funnel Step Sizes with Nested bitmapAnd

```sql
-- Classic marketing funnel: visited -> signed_up -> purchased
-- Assumes three segment bitmaps already exist
WITH
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active'     AND day = '2024-06-01') AS visited,
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'new_signup' AND day = '2024-06-02') AS signed_up,
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'churned'    AND day = '2024-06-01') AS purchased
SELECT
    bitmapCardinality(visited)                          AS step1_visited,
    bitmapCardinality(bitmapAnd(visited, signed_up))   AS step2_signed_up,
    bitmapCardinality(
        bitmapAnd(bitmapAnd(visited, signed_up), purchased)
    )                                                  AS step3_purchased;
```

## Retention Calculation

```sql
-- Day-over-day retention rate
WITH
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-01') AS day1,
    (SELECT user_bitmap FROM audience_bitmaps WHERE segment = 'active' AND day = '2024-06-02') AS day2
SELECT
    bitmapCardinality(day1)                         AS day1_users,
    bitmapCardinality(day2)                         AS day2_users,
    bitmapAndCardinality(day1, day2)                AS retained,
    round(
        bitmapAndCardinality(day1, day2) * 100.0
        / bitmapCardinality(day1),
        2
    )                                               AS retention_pct;
```

```text
day1_users  day2_users  retained  retention_pct
10000       8000        5000      50.00
```

## Comparing bitmapCardinality vs uniqExact

```sql
-- Both return the same count; bitmap is faster when bitmap is pre-built
SELECT
    uniqExact(user_id)                           AS uniq_exact_count,
    bitmapCardinality(groupBitmapState(toUInt64(user_id))) AS bitmap_count
FROM (
    SELECT number AS user_id FROM numbers(1, 100001)
);
```

For pre-aggregated materialized views, `bitmapCardinality` avoids re-scanning raw data entirely.

## Summary

`bitmapCardinality(bitmap)` is the primary way to count distinct elements in a Roaring Bitmap. Use it directly on stored bitmaps for segment sizes, wrap it around `bitmapAnd`/`bitmapOr` for post-operation counts, or prefer the combined shortcuts (`bitmapAndCardinality`, `bitmapOrCardinality`, etc.) when you do not need the result bitmap itself. Paired with `groupBitmapOrState` in a materialized view, `bitmapCardinality` powers sub-millisecond unique-user counts over billions of rows.
