# How to Use bitmapToArray() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, bitmapToArray, Array, SQL

Description: Learn how to use bitmapToArray() in ClickHouse to convert a bitmap back into a sorted array of unsigned integers for inspection and downstream processing.

---

## Overview

`bitmapToArray(bitmap)` converts a ClickHouse bitmap into a sorted array of unsigned integers (`Array(UInt*)`, with the exact unsigned type matching the bitmap). This is the inverse of `bitmapBuild()` and is useful for debugging, exporting bitmap contents, or feeding bitmap results into array functions.

## Basic Usage

```sql
SELECT bitmapToArray(bitmapBuild([5, 3, 1, 4, 2])) AS elements
-- [1, 2, 3, 4, 5]  (always sorted in ascending order)
```

Bitmaps inherently store sorted unique integers, so the output array is always deduplicated and sorted.

## Deduplication Behavior

```sql
SELECT bitmapToArray(bitmapBuild([1, 1, 2, 2, 3, 3])) AS deduped
-- [1, 2, 3]
```

## Converting Aggregate Bitmaps to Arrays

When bitmaps are stored in `AggregatingMergeTree` tables, use `groupBitmapMergeState` to combine the stored states and then convert:

```sql
CREATE TABLE user_cohorts
(
    cohort_date Date,
    user_ids    AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY cohort_date;
```

Retrieve the user IDs in a cohort:

```sql
SELECT bitmapToArray(groupBitmapMergeState(user_ids)) AS cohort_user_ids
FROM user_cohorts
WHERE cohort_date = '2024-06-01'
```

## Feeding Bitmap Results into Array Functions

Once converted to an array, all ClickHouse array functions become available:

```sql
SELECT
    bm_arr,
    length(bm_arr)           AS element_count,
    arraySlice(bm_arr, 1, 5) AS first_5_elements,
    bm_arr[-1]               AS max_element
FROM (
    SELECT bitmapToArray(bitmapBuild([10, 30, 20, 50, 40])) AS bm_arr
)
```

## Checking Bitmap Contents for Debugging

During development, use `bitmapToArray` to inspect stored bitmaps:

```sql
SELECT
    feature,
    bitmapToArray(groupBitmapMergeState(active_users)) AS user_list
FROM user_activity_bitmap
WHERE date = '2024-06-01'
GROUP BY feature
LIMIT 3
```

This is useful when verifying that the correct user IDs were included in a bitmap aggregation.

## Intersection to Array

Convert the result of bitmap set operations to arrays:

```sql
SELECT
    bitmapToArray(
        bitmapAnd(
            bitmapBuild([1, 2, 3, 4, 5, 6]),
            bitmapBuild([4, 5, 6, 7, 8, 9])
        )
    ) AS shared_users
-- [4, 5, 6]
```

## Difference to Array

```sql
SELECT
    bitmapToArray(
        bitmapAndnot(
            bitmapBuild([1, 2, 3, 4, 5]),
            bitmapBuild([3, 4, 5])
        )
    ) AS only_in_first
-- [1, 2]
```

## Using with ARRAY JOIN for Row Expansion

Expand bitmap contents to individual rows:

```sql
SELECT user_id
FROM (
    SELECT bitmapToArray(groupBitmapMergeState(active_users)) AS user_ids
    FROM user_activity_bitmap
    WHERE date = '2024-06-01'
    GROUP BY date
)
ARRAY JOIN user_ids AS user_id
```

## Performance Consideration

`bitmapToArray` materializes all integers in the bitmap into memory. For very large bitmaps (millions of entries), avoid converting to arrays just for counting - use `bitmapCardinality()` instead:

```sql
-- Efficient: bitmapCardinality does not materialize all elements
SELECT bitmapCardinality(groupBitmapMergeState(active_users)) AS dau
FROM user_activity_bitmap
WHERE date = '2024-06-01'
GROUP BY date
```

## Summary

`bitmapToArray()` converts a ClickHouse bitmap into a sorted, deduplicated array of unsigned integers. It is the gateway between the bitmap domain and the array function domain, enabling inspection, row expansion, and downstream processing of bitmap aggregation results. For cardinality alone, prefer `bitmapCardinality()` to avoid unnecessary materialization.
