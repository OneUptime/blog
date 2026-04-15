# How to Use Roaring Bitmaps for Large Set Operations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, Roaring Bitmap, Performance, Analytics

Description: Learn how ClickHouse implements Roaring Bitmaps for compact, high-performance set operations on hundreds of millions of user IDs, covering storage, merging, and real-world patterns.

---

ClickHouse's bitmap support is built on the Roaring Bitmap format, a compressed bitset that uses three internal container types: array containers for sparse sets, bitset containers for dense sets, and run-length encoding containers for consecutive ranges. The format automatically selects the optimal representation, making it efficient for both sparse (e.g., 1 000 out of 1 billion IDs) and dense (e.g., all IDs in a 1-million range) scenarios. In ClickHouse, Roaring Bitmaps are stored as `AggregateFunction(groupBitmap, UInt64)` and operate through the `groupBitmap*`, `bitmap*`, and related functions.

## Why Roaring Bitmaps?

Storing 1 million UInt64 IDs as a raw array costs 8 MB (1 000 000 × 8 bytes). A Roaring Bitmap with run-length containers compresses the same sequential range to just a handful of bytes internally. You can build and query it instantly:

```sql
-- Build a bitmap from 1 million sequential IDs and count its elements
SELECT
    bitmapCardinality(
        bitmapBuild(CAST(range(1, 1000001), 'Array(UInt32)'))
    ) AS bitmap_count;
```

```text
bitmap_count
1000000
```

## Storage Architecture

```sql
-- Production schema: one bitmap per (segment, date) partition
CREATE TABLE user_segment_bitmaps
(
    segment_id  UInt32,
    event_date  Date,
    user_bitmap AggregateFunction(groupBitmap, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (segment_id, event_date)
PARTITION BY toYYYYMM(event_date);
```

```sql
-- Populate via a materialized view from raw events
CREATE MATERIALIZED VIEW user_segment_bitmaps_mv
TO user_segment_bitmaps
AS
SELECT
    segment_id,
    toDate(event_time)           AS event_date,
    groupBitmapState(user_id)    AS user_bitmap
FROM raw_user_events
GROUP BY segment_id, event_date;
```

## Populating with Large Datasets

```sql
-- Simulate 10 million user-segment memberships for 5 segments over 30 days
INSERT INTO user_segment_bitmaps
SELECT
    segment_id,
    event_date,
    groupBitmapState(toUInt64(user_id)) AS user_bitmap
FROM (
    SELECT
        1 + (number % 5)                        AS segment_id,
        toDate('2024-06-01') + (number % 30)    AS event_date,
        rand() % 5000000                        AS user_id
    FROM numbers(10000000)
)
GROUP BY segment_id, event_date;
```

## Merging Bitmaps Across Days

```sql
-- Monthly unique users per segment (correct cross-day deduplication)
SELECT
    segment_id,
    bitmapCardinality(groupBitmapOrState(user_bitmap)) AS monthly_unique_users
FROM user_segment_bitmaps
WHERE event_date BETWEEN '2024-06-01' AND '2024-06-30'
GROUP BY segment_id
ORDER BY segment_id;
```

## Multi-Segment Set Operations

```sql
-- Users in segment 1 AND segment 2 for all of June
WITH
    (
        SELECT groupBitmapOrState(user_bitmap)
        FROM user_segment_bitmaps
        WHERE segment_id = 1 AND event_date BETWEEN '2024-06-01' AND '2024-06-30'
    ) AS bm_seg1,
    (
        SELECT groupBitmapOrState(user_bitmap)
        FROM user_segment_bitmaps
        WHERE segment_id = 2 AND event_date BETWEEN '2024-06-01' AND '2024-06-30'
    ) AS bm_seg2
SELECT
    bitmapCardinality(bm_seg1)             AS seg1_users,
    bitmapCardinality(bm_seg2)             AS seg2_users,
    bitmapAndCardinality(bm_seg1, bm_seg2) AS intersection,
    bitmapOrCardinality(bm_seg1, bm_seg2)  AS union_count;
```

## Building and Inspecting Bitmaps

You can build a bitmap from an explicit array and convert it back to inspect its contents.

```sql
-- Build a bitmap from an array and convert back to verify contents
SELECT bitmapToArray(
    bitmapBuild(CAST([1, 2, 3, 100, 200, 300], 'Array(UInt32)'))
) AS bitmap_elements;
```

```text
bitmap_elements
[1, 2, 3, 100, 200, 300]
```

## Retention Cohort Analysis

A classic Roaring Bitmap use case: N-day retention across millions of users.

```sql
-- 7-day rolling retention: users active on day 0 who returned on each subsequent day
WITH
    (
        SELECT groupBitmapOrState(user_bitmap)
        FROM user_segment_bitmaps
        WHERE segment_id = 1 AND event_date = '2024-06-01'
    ) AS day0
SELECT
    day_offset,
    bitmapAndCardinality(
        day0,
        (
            SELECT groupBitmapOrState(user_bitmap)
            FROM user_segment_bitmaps
            WHERE segment_id = 1
              AND event_date = toDate('2024-06-01') + day_offset
        )
    ) AS returning_users,
    round(
        bitmapAndCardinality(
            day0,
            (
                SELECT groupBitmapOrState(user_bitmap)
                FROM user_segment_bitmaps
                WHERE segment_id = 1
                  AND event_date = toDate('2024-06-01') + day_offset
            )
        ) * 100.0 / bitmapCardinality(day0),
        2
    ) AS retention_pct
FROM (SELECT number AS day_offset FROM numbers(1, 8))
ORDER BY day_offset;
```

## Funnel Analysis with Bitmaps

```sql
-- 3-step funnel: impression -> click -> conversion (all in June)
WITH
    (SELECT groupBitmapOrState(user_bitmap) FROM user_segment_bitmaps WHERE segment_id = 1
     AND event_date BETWEEN '2024-06-01' AND '2024-06-30') AS impressions,
    (SELECT groupBitmapOrState(user_bitmap) FROM user_segment_bitmaps WHERE segment_id = 2
     AND event_date BETWEEN '2024-06-01' AND '2024-06-30') AS clicks,
    (SELECT groupBitmapOrState(user_bitmap) FROM user_segment_bitmaps WHERE segment_id = 3
     AND event_date BETWEEN '2024-06-01' AND '2024-06-30') AS conversions
SELECT
    bitmapCardinality(impressions)                                     AS step1_impressions,
    bitmapAndCardinality(impressions, clicks)                          AS step2_clicked,
    bitmapAndCardinality(bitmapAnd(impressions, clicks), conversions)  AS step3_converted,
    round(bitmapAndCardinality(impressions, clicks) * 100.0
          / bitmapCardinality(impressions), 2)                         AS click_rate_pct,
    round(bitmapAndCardinality(bitmapAnd(impressions, clicks), conversions) * 100.0
          / bitmapAndCardinality(impressions, clicks), 2)              AS conversion_rate_pct;
```

## Memory and Performance Guidelines

```sql
-- Check bitmap cardinalities per segment to monitor bitmap sizes
SELECT
    segment_id,
    count()                                  AS bitmap_rows,
    avg(bitmapCardinality(user_bitmap))      AS avg_bitmap_cardinality,
    max(bitmapCardinality(user_bitmap))      AS max_bitmap_cardinality,
    sum(bitmapCardinality(user_bitmap))      AS total_elements
FROM user_segment_bitmaps
GROUP BY segment_id
ORDER BY segment_id;
```

For sequential or near-sequential ID ranges, Roaring Bitmaps use run-length containers and can compress a million IDs into under 100 bytes. For random IDs with low density, array containers are used and compression is more modest. Avoid calling `bitmapToArray` on bitmaps with millions of elements - use cardinality functions instead.

## Summary

ClickHouse implements Roaring Bitmaps as `AggregateFunction(groupBitmap, UInt64)` states, automatically using array, bitset, or run-length containers depending on data density. Build bitmaps with `groupBitmapState` in materialized views, merge them with `groupBitmapOrState` / `groupBitmapAndState`, and query them with the full suite of `bitmap*` functions. This architecture supports sub-millisecond unique-user counts, retention cohort analysis, multi-segment funnels, and audience intersection queries over billions of events without full table scans.
