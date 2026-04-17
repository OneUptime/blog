# How to Use bitmapBuild() and bitmapToArray() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Array, Conversion, Query Optimization

Description: Learn how bitmapBuild() constructs a Roaring Bitmap from an array and bitmapToArray() converts it back, bridging ClickHouse array operations and bitmap set operations.

---

`bitmapBuild(array)` and `bitmapToArray(bitmap)` are the two conversion primitives in ClickHouse's bitmap API. `bitmapBuild` takes an `Array(UInt32)` and returns a `Bitmap(UInt32)` Roaring Bitmap. `bitmapToArray` reverses the process, returning an `Array(UInt32)` of all elements stored in the bitmap in ascending order. Together they let you bridge ad-hoc array data and the persistent bitmap aggregation ecosystem, as well as inspect bitmap contents during development.

## bitmapBuild() - Constructing a Bitmap from an Array

```sql
-- Build a bitmap directly from an integer literal array
SELECT
    bitmapBuild(CAST([1, 5, 10, 20, 50, 100], 'Array(UInt32)')) AS my_bitmap,
    bitmapCardinality(
        bitmapBuild(CAST([1, 5, 10, 20, 50, 100], 'Array(UInt32)'))
    ) AS element_count;
```

```text
my_bitmap                      element_count
AggregateFunctionBitmap(...)   6
```

## bitmapToArray() - Converting a Bitmap Back to an Array

```sql
-- Inspect the elements stored in a bitmap
SELECT
    bitmapToArray(
        bitmapBuild(CAST([10, 20, 30, 40, 50], 'Array(UInt32)'))
    ) AS elements;
```

```text
elements
[10, 20, 30, 40, 50]
```

The returned array is always sorted in ascending order.

## Round-Trip Verification

```sql
-- Confirm build -> toArray round-trip preserves all values
WITH
    CAST([7, 3, 42, 1, 99, 15], 'Array(UInt32)') AS original_array,
    bitmapBuild(CAST([7, 3, 42, 1, 99, 15], 'Array(UInt32)')) AS bm
SELECT
    original_array,
    bitmapToArray(bm)          AS bitmap_array,   -- sorted: [1, 3, 7, 15, 42, 99]
    bitmapCardinality(bm)      AS cardinality;
```

```text
original_array          bitmap_array         cardinality
[7,3,42,1,99,15]       [1,3,7,15,42,99]     6
```

Duplicates are removed automatically.

```sql
-- Duplicates are deduplicated
SELECT
    bitmapToArray(
        bitmapBuild(CAST([5, 5, 5, 10, 10, 20], 'Array(UInt32)'))
    ) AS deduped;
```

```text
deduped
[5, 10, 20]
```

## Building Bitmaps from Table Data with groupArray

```sql
-- Collect user IDs into an array, then build a bitmap for further operations
SELECT
    segment,
    bitmapBuild(
        CAST(groupArray(toUInt32(user_id)), 'Array(UInt32)')
    ) AS user_bitmap
FROM user_segments
GROUP BY segment;
```

Note: `groupBitmapState` is more efficient for large datasets because it builds the bitmap incrementally without materializing the full array first.

## Using bitmapToArray to Expand Stored Bitmaps

```sql
CREATE TABLE stored_bitmaps
(
    segment     String,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY segment;
```

```sql
INSERT INTO stored_bitmaps
SELECT segment, groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT 'vip' AS segment, number AS user_id FROM numbers(1, 10)
)
GROUP BY segment;
```

```sql
-- Expand the VIP bitmap to individual rows for joining or display
SELECT
    arrayJoin(bitmapToArray(user_bitmap)) AS vip_user_id
FROM stored_bitmaps
WHERE segment = 'vip'
ORDER BY vip_user_id;
```

```text
vip_user_id
1
2
3
...
10
```

## arrayJoin on bitmapToArray for Per-Row Processing

```sql
-- For each VIP user, look up their profile info
SELECT
    u.user_id,
    u.username,
    u.email
FROM users AS u
WHERE u.user_id IN (
    SELECT arrayJoin(bitmapToArray(user_bitmap))
    FROM stored_bitmaps
    WHERE segment = 'vip'
);
```

## Building an Ad-Hoc Bitmap for a One-Off Operation

```sql
-- Check which of these specific user IDs are also in the stored VIP bitmap
WITH
    bitmapBuild(CAST([3, 7, 11, 15], 'Array(UInt64)')) AS check_set,
    (SELECT user_bitmap FROM stored_bitmaps WHERE segment = 'vip') AS vip_bitmap
SELECT
    bitmapToArray(bitmapAnd(check_set, vip_bitmap)) AS found_in_vip,
    bitmapToArray(bitmapAndnot(check_set, vip_bitmap)) AS not_in_vip;
```

```text
found_in_vip  not_in_vip
[3, 7]        [11, 15]
```

## Creating Bitmaps from a Subquery Result

```sql
-- Build a bitmap from a dynamic subquery
SELECT
    bitmapToArray(
        bitmapBuild(
            CAST(
                (SELECT groupArray(toUInt32(number)) FROM numbers(1, 5)),
                'Array(UInt32)'
            )
        )
    ) AS dynamic_bitmap_elements;
```

```text
dynamic_bitmap_elements
[1, 2, 3, 4, 5]
```

## Filtering an Array Using Bitmap Membership

```sql
-- Keep only array elements that are in the VIP bitmap
WITH
    bitmapBuild(CAST([2, 4, 6, 8, 10, 12], 'Array(UInt64)')) AS candidate_ids,
    (SELECT user_bitmap FROM stored_bitmaps WHERE segment = 'vip') AS vip_bitmap
SELECT
    bitmapToArray(bitmapAnd(candidate_ids, vip_bitmap)) AS vip_candidates;
```

## Summary

`bitmapBuild(array)` converts an `Array(UInt32)` into a Roaring Bitmap, and `bitmapToArray(bitmap)` converts it back to a sorted `Array(UInt32)`. Use `bitmapBuild` to construct inline bitmaps for ad-hoc operations and testing. Use `bitmapToArray` to inspect bitmap contents, expand a stored bitmap into individual rows with `arrayJoin`, or prepare bitmap results for downstream array functions. For large-scale aggregations, prefer `groupBitmapState` over `bitmapBuild(groupArray(...))` because it avoids materializing a potentially huge intermediate array.
