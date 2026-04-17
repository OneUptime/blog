# How to Use bitmapContains() and bitmapHasAny() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Membership Test, Analytics, Filtering

Description: Learn how bitmapContains() checks if a single ID is in a bitmap and bitmapHasAny() tests if two bitmaps share at least one common element in ClickHouse.

---

ClickHouse offers two membership-test functions for Roaring Bitmaps. `bitmapContains(bitmap, needle)` returns `1` if the unsigned integer value `needle` exists in the bitmap, and `0` otherwise. `bitmapHasAny(bitmap_a, bitmap_b)` returns `1` if the two bitmaps have at least one element in common - equivalent to `bitmapAndCardinality(a, b) > 0` but potentially faster because it can short-circuit as soon as one shared element is found.

## Setting Up Sample Data

```sql
CREATE TABLE permission_bitmaps
(
    role        String,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY role;
```

```sql
INSERT INTO permission_bitmaps
SELECT role, groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT 'admin'    AS role, number AS user_id FROM numbers(1, 50)    -- admins: 1-50
    UNION ALL
    SELECT 'editor'   AS role, number AS user_id FROM numbers(50, 200)  -- editors: 50-249
    UNION ALL
    SELECT 'viewer'   AS role, number AS user_id FROM numbers(200, 500) -- viewers: 200-699
)
GROUP BY role;
```

## bitmapContains() - Single Value Membership Test

```sql
-- Is user 25 an admin?
SELECT
    bitmapContains(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),
        toUInt32(25)
    ) AS is_admin;
```

```text
is_admin
1
```

```sql
-- Is user 300 an admin? (should be 0 - they are a viewer)
SELECT
    bitmapContains(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),
        toUInt32(300)
    ) AS is_admin;
```

```text
is_admin
0
```

## Checking Multiple Roles for One User

```sql
-- Check all roles for user 75
WITH (SELECT toUInt32(75)) AS target_user
SELECT
    bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),  target_user) AS is_admin,
    bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor'), target_user) AS is_editor,
    bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer'), target_user) AS is_viewer;
```

```text
is_admin  is_editor  is_viewer
0         1          0
```

## bitmapContains() in a Row-Level Filter

Use `bitmapContains` inside a `WHERE` clause to filter a table by segment membership.

```sql
-- Return all event rows for users who are admins
SELECT
    e.user_id,
    e.event_type,
    e.event_time
FROM events AS e
WHERE
    bitmapContains(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),
        toUInt32(e.user_id)
    ) = 1
ORDER BY e.event_time
LIMIT 20;
```

Note: this pattern materializes the admin bitmap once per query, then each row test is O(log n) on the compressed bitmap.

## bitmapHasAny() - Intersection Existence Test

`bitmapHasAny(a, b)` returns `1` if the intersection of `a` and `b` is non-empty.

```sql
-- Do editors and viewers share any users?
SELECT
    bitmapHasAny(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor'),
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer')
    ) AS has_overlap;
```

```text
has_overlap
1
```

```sql
-- Do admins and viewers share any users?
SELECT
    bitmapHasAny(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer')
    ) AS has_overlap;
```

```text
has_overlap
0
```

## bitmapHasAll() - Superset Test

`bitmapHasAll(a, b)` returns `1` if every element in `b` also exists in `a` (i.e., `b` is a subset of `a`).

```sql
-- Check whether the editor bitmap contains a small test set of user IDs
SELECT
    bitmapHasAll(
        (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor'),
        bitmapBuild(CAST([50, 60, 70, 80], 'Array(UInt64)'))
    ) AS editor_contains_test_set;
```

```text
editor_contains_test_set
1
```

## Comparing Two User Cohorts for Overlap

A common use case is quickly checking whether two dynamically built cohorts share any members before running a more expensive join.

```sql
WITH
    (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor') AS editors,
    (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer') AS viewers
SELECT
    bitmapHasAny(editors, viewers)                          AS any_shared,
    bitmapAndCardinality(editors, viewers)                  AS shared_count,
    bitmapCardinality(editors)                              AS editor_count,
    bitmapCardinality(viewers)                              AS viewer_count;
```

## Using bitmapContains to Validate Writes

```sql
-- Check whether a newly registered user ID is already claimed in the admin bitmap
SELECT
    multiIf(
        bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'admin'),  toUInt32(999)), 'admin',
        bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor'), toUInt32(999)), 'editor',
        bitmapContains((SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer'), toUInt32(999)), 'viewer',
        'unknown'
    ) AS user_role;
```

## Performance Notes

```sql
-- bitmapHasAny short-circuits; bitmapAndCardinality always computes the full intersection
-- Use bitmapHasAny when you only need a yes/no answer
WITH
    (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor') AS bm_e,
    (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'viewer') AS bm_v
SELECT
    bitmapHasAny(bm_e, bm_v)            AS fast_overlap_check,
    bitmapAndCardinality(bm_e, bm_v) > 0 AS equivalent_but_slower;
```

## Summary

`bitmapContains(bitmap, needle)` tests whether a single `UInt32` value is present in a bitmap, making it ideal for row-level permission checks. `bitmapHasAny(a, b)` tests whether two bitmaps overlap at all, useful for quickly validating whether targeting segments intersect before committing to a full operation. For superset checks use `bitmapHasAll(a, b)`. When you need a yes/no answer rather than a count, prefer `bitmapHasAny` over `bitmapAndCardinality(...) > 0` because it can short-circuit on the first match.
