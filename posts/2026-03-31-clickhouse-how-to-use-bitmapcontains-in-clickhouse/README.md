# How to Use bitmapContains() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, bitmapContains, Set Membership, SQL

Description: Learn how to use bitmapContains() in ClickHouse to efficiently check if a specific integer is present in a bitmap for set membership queries.

---

## Overview

`bitmapContains(bitmap, value)` tests whether a given unsigned integer is a member of a ClickHouse Roaring Bitmap. It returns 1 if the value is present and 0 if not. This is the bitmap equivalent of `has()` for arrays, and is optimized for O(log n) lookup on compressed bitmap structures.

## Basic Usage

```sql
SELECT bitmapContains(bitmapBuild([1, 2, 3, 4, 5]), toUInt32(3)) AS found
-- 1

SELECT bitmapContains(bitmapBuild([1, 2, 3, 4, 5]), toUInt32(9)) AS found
-- 0
```

Note: the value argument can be any of `(U)Int8/16/32/64`. Explicit casting (e.g., `toUInt32(...)` or `toUInt64(...)`) is recommended to make the type match the bitmap's element type and avoid ambiguous conversions.

## Filtering with bitmapContains

Use `bitmapContains` in WHERE clauses to filter rows based on bitmap membership:

```sql
CREATE TABLE blocked_users_bitmap
(
    date         Date,
    blocked_ids  AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY date;
```

Filter events from blocked users:

```sql
SELECT
    e.event_id,
    e.user_id,
    e.event_time
FROM events e
JOIN (
    SELECT groupBitmapMerge(blocked_ids) AS bm
    FROM blocked_users_bitmap
    WHERE date = today()
) blocked ON 1=1
WHERE NOT bitmapContains(blocked.bm, toUInt64(e.user_id))
```

## Checking Membership in Cohort Bitmaps

Find whether a specific user was active on a given date:

```sql
SELECT
    bitmapContains(groupBitmapMerge(active_users), toUInt64(10042)) AS was_active
FROM user_activity_bitmap
WHERE date = '2024-06-01'
```

## Using bitmapContains in a Case Expression

Classify users based on bitmap membership:

```sql
SELECT
    user_id,
    CASE
        WHEN bitmapContains(premium_bm, toUInt64(user_id)) THEN 'premium'
        WHEN bitmapContains(trial_bm,   toUInt64(user_id)) THEN 'trial'
        ELSE 'free'
    END AS tier
FROM all_users
CROSS JOIN (
    SELECT
        groupBitmapMerge(if(tier='premium', user_bm, bitmapBuild([]))) AS premium_bm,
        groupBitmapMerge(if(tier='trial',   user_bm, bitmapBuild([]))) AS trial_bm
    FROM tier_bitmaps
) bitmaps
```

## Comparing bitmapContains vs. has()

| Feature        | bitmapContains()                  | has()                    |
|----------------|-----------------------------------|--------------------------|
| Input type     | Bitmap (AggregateFunction)        | Array(T)                 |
| Lookup speed   | O(log n) on compressed bitmap     | O(n) linear scan         |
| Memory         | Very compact (Roaring Bitmap)     | One array per row        |
| Best for       | Large pre-aggregated sets         | Small per-row arrays     |

## Multiple Membership Checks

Check membership against several bitmaps in one query:

```sql
SELECT
    user_id,
    bitmapContains(feature_a_bm, toUInt64(user_id)) AS has_feature_a,
    bitmapContains(feature_b_bm, toUInt64(user_id)) AS has_feature_b,
    bitmapContains(churned_bm,   toUInt64(user_id)) AS is_churned
FROM candidate_users
CROSS JOIN global_bitmaps
LIMIT 100
```

## Building the Bitmap Once and Reusing

For queries that check many user IDs against the same bitmap, materialize the bitmap in a subquery once:

```sql
WITH blocked AS (
    SELECT groupBitmapMerge(blocked_ids) AS bm
    FROM blocked_users_bitmap
    WHERE date = today()
)
SELECT count() AS clean_events
FROM events, blocked
WHERE NOT bitmapContains(blocked.bm, toUInt64(user_id))
```

## Summary

`bitmapContains(bitmap, value)` provides efficient O(log n) membership testing in ClickHouse Roaring Bitmaps. It is ideal for large pre-aggregated sets like blocked user lists, cohort membership, and feature flag enrollments - where `has()` on a per-row array would be too slow or memory-intensive.
