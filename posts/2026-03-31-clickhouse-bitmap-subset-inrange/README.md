# How to Use bitmapSubsetInRange() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Subset, Range Query, Analytics

Description: Learn how bitmapSubsetInRange() extracts a slice of a Roaring Bitmap by value range in ClickHouse, enabling efficient paginated ID retrieval and range-filtered bitmap operations.

---

`bitmapSubsetInRange(bitmap, range_start, range_end)` returns a new bitmap containing only the elements from the source bitmap whose values fall in the half-open interval `[range_start, range_end)`. It also has a companion `bitmapSubsetLimit(bitmap, range_start, limit)` which returns at most `limit` elements starting from `range_start`. Both functions work on `AggregateFunction(groupBitmap, UInt64)` bitmaps and return a new bitmap of the same type.

## Creating a Sample Bitmap

```sql
-- Build a bitmap containing user IDs 1-1000
SELECT
    bitmapToArray(
        bitmapSubsetInRange(
            bitmapBuild(CAST(range(1, 1001), 'Array(UInt32)')),
            1,
            101
        )
    ) AS first_100_ids;
```

```text
first_100_ids
[1, 2, 3, ..., 100]
```

## Basic bitmapSubsetInRange() Usage

```sql
-- Prepare a stored bitmap
CREATE TABLE range_demo
(
    name        String,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY name;
```

```sql
INSERT INTO range_demo
SELECT 'all_users', groupBitmapState(toUInt64(number)) AS user_bitmap
FROM numbers(1, 10000);  -- user IDs 1-10000
```

```sql
-- Extract users with IDs in range [1000, 2000)
SELECT
    bitmapCardinality(
        bitmapSubsetInRange(user_bitmap, toUInt64(1000), toUInt64(2000))
    ) AS users_1000_to_1999
FROM range_demo
WHERE name = 'all_users';
```

```text
users_1000_to_1999
1000
```

```sql
-- Inspect the actual IDs in a small subrange
SELECT
    bitmapToArray(
        bitmapSubsetInRange(user_bitmap, toUInt64(9995), toUInt64(10001))
    ) AS last_few_ids
FROM range_demo
WHERE name = 'all_users';
```

```text
last_few_ids
[9995, 9996, 9997, 9998, 9999, 10000]
```

## bitmapSubsetLimit() - Paginated ID Retrieval

`bitmapSubsetLimit(bitmap, range_start, limit)` returns up to `limit` elements starting from the first element >= `range_start`.

```sql
-- Page 1: first 100 IDs starting from 1
SELECT
    bitmapToArray(
        bitmapSubsetLimit(user_bitmap, toUInt64(1), toUInt64(100))
    ) AS page_1
FROM range_demo
WHERE name = 'all_users';
```

```sql
-- Page 2: next 100 IDs starting from 101
SELECT
    bitmapToArray(
        bitmapSubsetLimit(user_bitmap, toUInt64(101), toUInt64(100))
    ) AS page_2
FROM range_demo
WHERE name = 'all_users';
```

## Combining Subset with Set Operations

Extract a range from the result of a set operation.

```sql
-- Users in both 'active' and 'newsletter' segments, IDs in [500, 1000)
CREATE TABLE segment_bitmaps2
(
    segment     String,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY segment;
```

```sql
INSERT INTO segment_bitmaps2
SELECT segment, groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT 'active'     AS segment, number AS user_id FROM numbers(1, 2001)
    UNION ALL
    SELECT 'newsletter' AS segment, number AS user_id FROM numbers(501, 2000)
)
GROUP BY segment;
```

```sql
WITH
    (SELECT user_bitmap FROM segment_bitmaps2 WHERE segment = 'active')     AS bm_active,
    (SELECT user_bitmap FROM segment_bitmaps2 WHERE segment = 'newsletter') AS bm_newsletter
SELECT
    bitmapToArray(
        bitmapSubsetInRange(
            bitmapAnd(bm_active, bm_newsletter),
            toUInt64(500),
            toUInt64(1000)
        )
    ) AS intersection_500_to_999;
```

## Using Subsets for Sharded Processing

Divide a large bitmap into fixed-size shards for parallel processing.

```sql
-- Process the bitmap in shards of 1000 IDs
WITH
    (SELECT user_bitmap FROM range_demo WHERE name = 'all_users') AS full_bitmap
SELECT
    shard_num,
    bitmapCardinality(
        bitmapSubsetInRange(full_bitmap, toUInt64(shard_num * 1000 + 1), toUInt64((shard_num + 1) * 1000 + 1))
    ) AS shard_size
FROM (
    SELECT number AS shard_num FROM numbers(0, 10)
)
ORDER BY shard_num;
```

```text
shard_num  shard_size
0          1000
1          1000
2          1000
...
9          1000
```

## Range-Based Cohort Analysis

Use ID ranges to approximate sign-up cohorts when user IDs are assigned sequentially.

```sql
-- Assume user IDs 1-5000 signed up in Q1, 5001-10000 in Q2
WITH
    (SELECT user_bitmap FROM range_demo WHERE name = 'all_users') AS all_active
SELECT
    'Q1_cohort' AS cohort,
    bitmapCardinality(bitmapSubsetInRange(all_active, toUInt64(1),    toUInt64(5001))) AS active_users
UNION ALL
SELECT
    'Q2_cohort',
    bitmapCardinality(bitmapSubsetInRange(all_active, toUInt64(5001), toUInt64(10001)))
ORDER BY cohort;
```

## Efficient Range Membership Count

`bitmapSubsetInRange` is faster than converting to an array and filtering when you need a count of elements in a value range.

```sql
-- Count active users whose IDs fall in the "premium tier" range (IDs 2000-3999)
SELECT
    bitmapCardinality(
        bitmapSubsetInRange(user_bitmap, toUInt64(2000), toUInt64(4000))
    ) AS premium_tier_count
FROM range_demo
WHERE name = 'all_users';
```

```text
premium_tier_count
2000
```

## Summary

`bitmapSubsetInRange(bitmap, start, end)` extracts the slice of a Roaring Bitmap whose values fall in `[start, end)` and returns a new bitmap. `bitmapSubsetLimit(bitmap, start, limit)` extracts at most `limit` elements starting at the first value >= `start`. Use these functions for paginated ID retrieval, range-based cohort slicing, dividing large bitmaps into processing shards, and range-filtered set operations. Both return full bitmap objects that can be passed directly to any other bitmap function.
