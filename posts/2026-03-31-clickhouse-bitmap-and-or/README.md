# How to Use bitmapAnd() and bitmapOr() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Analytics, Set Operation, Query Optimization

Description: Learn how bitmapAnd() and bitmapOr() perform intersection and union operations on Roaring Bitmaps in ClickHouse, enabling fast multi-segment audience and permission queries.

---

ClickHouse's bitmap functions operate on `AggregateFunction(groupBitmap, UInt64)` columns that store Roaring Bitmaps. `bitmapAnd(a, b)` returns a new bitmap containing only the element IDs present in both bitmaps (intersection), while `bitmapOr(a, b)` returns a bitmap containing all element IDs present in either bitmap (union). Both functions are applied after you have already materialized bitmaps - typically using `groupBitmapState` in an aggregating materialized view - and they make multi-segment set operations orders of magnitude faster than joining raw ID tables.

## Building Sample Bitmaps

Start by creating a table that stores pre-computed bitmaps per segment, then populate it.

```sql
-- Table to hold one bitmap per segment
CREATE TABLE segment_bitmaps
(
    segment_name  String,
    user_bitmap   AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY segment_name;
```

```sql
-- Insert bitmaps built from raw user-segment membership rows
INSERT INTO segment_bitmaps
SELECT
    segment_name,
    groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT 'newsletter'  AS segment_name, number AS user_id FROM numbers(1, 500)  -- users 1-500
    UNION ALL
    SELECT 'mobile_app'  AS segment_name, number AS user_id FROM numbers(251, 500) -- users 251-750
    UNION ALL
    SELECT 'paid_plan'   AS segment_name, number AS user_id FROM numbers(401, 400) -- users 401-800
)
GROUP BY segment_name;
```

## bitmapAnd() - Intersection

`bitmapAnd` finds users that belong to ALL specified segments simultaneously.

```sql
-- Users who are in BOTH newsletter and mobile_app segments
SELECT
    bitmapCardinality(
        bitmapAnd(
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
        )
    ) AS intersection_count;
```

```text
intersection_count
250
```

```sql
-- Convert the intersection bitmap to an array to see actual user IDs
SELECT
    bitmapToArray(
        bitmapAnd(
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
        )
    ) AS shared_users;
```

## bitmapOr() - Union

`bitmapOr` finds all users that belong to ANY of the specified segments.

```sql
-- Users in newsletter OR mobile_app (or both)
SELECT
    bitmapCardinality(
        bitmapOr(
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
        )
    ) AS union_count;
```

```text
union_count
750
```

## Chaining Multiple Bitmaps

Both functions accept exactly two arguments, so chain them for three or more segments.

```sql
-- Users in newsletter OR mobile_app OR paid_plan
SELECT
    bitmapCardinality(
        bitmapOr(
            bitmapOr(
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
            ),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'paid_plan')
        )
    ) AS total_reachable_users;
```

```sql
-- Users in ALL three segments (nested AND)
SELECT
    bitmapCardinality(
        bitmapAnd(
            bitmapAnd(
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
            ),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'paid_plan')
        )
    ) AS all_three_count;
```

## Combining AND and OR for Complex Targeting

Real audience queries combine intersection and union to express include/exclude logic.

```sql
-- "mobile_app users who are also on paid_plan, plus all newsletter users"
SELECT
    bitmapCardinality(
        bitmapOr(
            bitmapAnd(
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app'),
                (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'paid_plan')
            ),
            (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter')
        )
    ) AS target_audience_size;
```

## Using WITH to Improve Readability

CTEs make complex bitmap expressions easier to follow.

```sql
WITH
    (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter')  AS bm_newsletter,
    (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')  AS bm_mobile,
    (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'paid_plan')   AS bm_paid
SELECT
    bitmapCardinality(bitmapAnd(bm_newsletter, bm_mobile))   AS newsletter_and_mobile,
    bitmapCardinality(bitmapOr(bm_newsletter, bm_mobile))    AS newsletter_or_mobile,
    bitmapCardinality(bitmapAnd(bm_mobile, bm_paid))         AS mobile_and_paid,
    bitmapCardinality(bitmapOr(bm_newsletter, bm_paid))      AS newsletter_or_paid;
```

```text
newsletter_and_mobile  newsletter_or_mobile  mobile_and_paid  newsletter_or_paid
250                    750                   350              800
```

## Verifying Results with bitmapToArray

Inspect a small result bitmap to confirm correctness.

```sql
-- Verify intersection contains only IDs in range 251-500
WITH
    (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter') AS bm_a,
    (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app') AS bm_b
SELECT
    arraySort(bitmapToArray(bitmapAnd(bm_a, bm_b))) AS intersection_ids,
    length(bitmapToArray(bitmapAnd(bm_a, bm_b)))    AS count_check;
```

## Aggregated AND and OR Across Many Segments

Use `groupBitmapAndState` and `groupBitmapOrState` to intersect or union bitmaps from multiple rows in one pass.

```sql
-- Union all segment bitmaps in a single aggregation
SELECT
    bitmapCardinality(groupBitmapOrState(user_bitmap)) AS total_unique_users
FROM segment_bitmaps;
```

```sql
-- Intersection of all segment bitmaps (users in every segment)
SELECT
    bitmapCardinality(groupBitmapAndState(user_bitmap)) AS users_in_all_segments
FROM segment_bitmaps;
```

## Performance Comparison: Bitmap vs JOIN

```sql
-- Traditional approach: join two user-segment tables
SELECT count(DISTINCT a.user_id)
FROM user_segment_raw a
INNER JOIN user_segment_raw b
    ON a.user_id = b.user_id
    AND b.segment_name = 'mobile_app'
WHERE a.segment_name = 'newsletter';

-- Bitmap approach: one sub-select per bitmap, single bitmapAnd call
SELECT bitmapCardinality(
    bitmapAnd(
        (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'newsletter'),
        (SELECT user_bitmap FROM segment_bitmaps WHERE segment_name = 'mobile_app')
    )
);
-- For hundreds of millions of users the bitmap approach is typically 10-100x faster
```

## Summary

`bitmapAnd(a, b)` computes the set intersection and `bitmapOr(a, b)` computes the set union of two Roaring Bitmaps stored as `AggregateFunction(groupBitmap, UInt64)` columns. Chain calls for more than two operands, or use `groupBitmapAndState` / `groupBitmapOrState` when collapsing many bitmap rows at once. These operations are the foundation of fast audience segmentation, permission checks, and funnel analysis in ClickHouse.
