# How to Use bitmapMin() and bitmapMax() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmap, bitmapMin, bitmapMax, Roaring Bitmap, Aggregation

Description: Learn how to use bitmapMin() and bitmapMax() in ClickHouse to find the smallest and largest set bits in a roaring bitmap for user ID range and cohort analysis.

---

ClickHouse roaring bitmaps store sets of unsigned integers (`UInt8`, `UInt16`, `UInt32`, or `UInt64`). `bitmapMin()` and `bitmapMax()` return the smallest and largest integers stored in a bitmap - useful for finding the earliest and latest user IDs, event sequence numbers, or any numeric range stored in a bitmap.

## Basic Usage

```sql
SELECT
    bitmapMin(bitmapBuild([3, 7, 1, 42, 15])) AS min_val,
    bitmapMax(bitmapBuild([3, 7, 1, 42, 15])) AS max_val;
```

```text
min_val | max_val
--------+--------
1       | 42
```

## Finding the Earliest and Latest Registered User in a Segment

If user IDs are assigned monotonically, `bitmapMin()` gives the oldest user and `bitmapMax()` gives the newest:

```sql
SELECT
    segment_name,
    bitmapMin(user_bitmap) AS oldest_user_id,
    bitmapMax(user_bitmap) AS newest_user_id,
    bitmapCardinality(user_bitmap) AS segment_size
FROM user_segments
GROUP BY segment_name;
```

## Tracking Event Sequence Range per Session

Store the event sequence numbers for each session as a bitmap and use `bitmapMin/Max` to find the first and last event:

```sql
SELECT
    session_id,
    bitmapMin(event_seq_bitmap) AS first_event_seq,
    bitmapMax(event_seq_bitmap) AS last_event_seq,
    bitmapMax(event_seq_bitmap) - bitmapMin(event_seq_bitmap) AS sequence_span
FROM session_events
GROUP BY session_id
ORDER BY sequence_span DESC
LIMIT 10;
```

## Detecting Gaps in Bitmap Coverage

Compare `bitmapMin/Max` with `bitmapCardinality()` to detect sparse bitmaps (many gaps):

```sql
SELECT
    cohort_id,
    bitmapMin(user_bitmap)                              AS min_uid,
    bitmapMax(user_bitmap)                              AS max_uid,
    bitmapMax(user_bitmap) - bitmapMin(user_bitmap) + 1 AS id_range,
    bitmapCardinality(user_bitmap)                      AS actual_count,
    round(
        100.0 * bitmapCardinality(user_bitmap)
              / (bitmapMax(user_bitmap) - bitmapMin(user_bitmap) + 1),
        1
    ) AS fill_pct
FROM cohorts;
```

A low `fill_pct` indicates a sparse cohort - users are spread across a wide ID range with many gaps.

## Using with groupBitmap() Aggregation

When aggregating bitmaps from multiple rows, `bitmapMin/Max` work on the combined result:

```sql
SELECT
    toDate(event_date)                      AS date,
    bitmapMin(groupBitmapState(user_id))    AS min_uid_active,
    bitmapMax(groupBitmapState(user_id))    AS max_uid_active
FROM daily_active_users
GROUP BY date
ORDER BY date DESC;
```

## Edge Cases

An empty bitmap returns `UINT32_MAX` (4294967295) for `bitmapMin()` and 0 for `bitmapMax()` (the return type is `UInt64` in both cases; for bitmaps built from `UInt64` values, `bitmapMin()` returns `UINT64_MAX`):

```sql
SELECT
    bitmapMin(bitmapBuild(emptyArrayUInt32())) AS empty_min,
    bitmapMax(bitmapBuild(emptyArrayUInt32())) AS empty_max;
```

Always check `bitmapCardinality() > 0` before interpreting min/max results on potentially empty bitmaps.

## Summary

`bitmapMin()` and `bitmapMax()` return the smallest and largest integers in a roaring bitmap. They are useful for finding ID ranges, detecting sparse cohorts, and tracking sequence number spans across sessions. For empty bitmaps, treat the results with care and always guard with a cardinality check.
