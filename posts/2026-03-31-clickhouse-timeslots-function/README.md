# How to Use timeSlots() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Session Analysis, Array Function, Time Series

Description: Learn how timeSlots() generates an array of DateTime values covering a time range in fixed-size intervals, enabling session analysis and coverage reporting.

---

`timeSlots(start, duration, slot_size)` returns an `Array(DateTime)` of slot-aligned time points covering the interval from `start` through `start + duration`. The first element is rounded down to the nearest `slot_size` boundary, and slots continue up to and including the boundary at or before `start + duration`. The `slot_size` parameter specifies the interval length in seconds. For example, `timeSlots(start, 7200, 1800)` for a 2-hour event with 30-minute slots returns up to 5 DateTime values covering the event's duration. This function is designed for use with `ARRAY JOIN`, transforming one row per event into multiple rows - one per covered time slot - making it easy to compute coverage metrics, overlapping session counts, and availability reports.

## Basic Usage

```sql
-- See the array generated for a 90-minute session in 30-minute slots
SELECT
    toDateTime('2024-06-15 14:00:00') AS session_start,
    5400 AS duration_seconds,  -- 90 minutes
    1800 AS slot_size_seconds, -- 30 minutes
    timeSlots(session_start, duration_seconds, slot_size_seconds) AS slots;
```

```text
session_start           duration_seconds  slot_size_seconds  slots
2024-06-15 14:00:00     5400              1800               ['2024-06-15 14:00:00','2024-06-15 14:30:00','2024-06-15 15:00:00','2024-06-15 15:30:00']
```

Four 30-minute slots are generated: 14:00, 14:30, 15:00, and 15:30, covering the 90-minute window.

## Exploding Sessions Into Per-Slot Rows With ARRAY JOIN

The primary pattern is to use `ARRAY JOIN` to produce one row per slot per session, then aggregate by slot to compute concurrent session counts.

```sql
-- Count how many sessions are active in each 30-minute slot
SELECT
    slot,
    count() AS concurrent_sessions
FROM (
    SELECT
        arrayJoin(
            timeSlots(session_start, toUInt32(session_duration_seconds), 1800)
        ) AS slot
    FROM user_sessions
    WHERE session_date = today()
)
GROUP BY slot
ORDER BY slot;
```

## Detecting Peak Concurrency

By exploding sessions into per-slot rows, you can find the slot with the highest number of overlapping sessions.

```sql
-- Find the top 5 slots with the most concurrent sessions in the last 7 days
SELECT
    slot,
    count() AS concurrent_sessions
FROM (
    SELECT
        arrayJoin(
            timeSlots(session_start, toUInt32(session_duration_seconds), 1800)
        ) AS slot
    FROM user_sessions
    WHERE session_date >= today() - 7
)
GROUP BY slot
ORDER BY concurrent_sessions DESC
LIMIT 5;
```

## Coverage Reporting: Did a Window Have Activity?

For availability or coverage monitoring, you want to know which 30-minute windows in a day had at least one active session.

```sql
-- Which 30-minute windows of today had at least one active session?
SELECT
    slot,
    countDistinct(user_id) AS active_users,
    count() AS session_count
FROM (
    SELECT
        user_id,
        arrayJoin(
            timeSlots(session_start, toUInt32(session_duration_seconds), 1800)
        ) AS slot
    FROM user_sessions
    WHERE session_date = today()
)
GROUP BY slot
ORDER BY slot;
```

## Using 1-Hour Slot Size

Adjust the slot size for coarser granularity. A `slot_size` of 3600 produces hourly buckets.

```sql
-- Hourly active users from session data
SELECT
    slot AS hour_bucket,
    countDistinct(user_id) AS unique_users
FROM (
    SELECT
        user_id,
        arrayJoin(
            timeSlots(session_start, toUInt32(session_duration_seconds), 3600)
        ) AS slot
    FROM user_sessions
    WHERE session_date >= today() - 30
)
GROUP BY hour_bucket
ORDER BY hour_bucket;
```

## Comparing timeSlots With timeSlot (Singular)

`timeSlots` (plural) and `timeSlot` (singular) solve different problems.

```sql
-- timeSlot (singular): rounds down a single DateTime to the nearest 30-min boundary
SELECT timeSlot(now()) AS current_slot;

-- timeSlots (plural): generates an ARRAY of slots covering a duration
SELECT timeSlots(now(), 3600, 1800) AS slots_for_next_hour;
```

```text
current_slot            slots_for_next_hour
2024-06-15 14:00:00     ['2024-06-15 14:00:00','2024-06-15 14:30:00','2024-06-15 15:00:00']
```

Use `timeSlot` for bucketing a point in time. Use `timeSlots` for expanding an interval into multiple bucket rows.

## Generating Time Buckets for Gantt-Style Charts

`timeSlots` is useful when building data for Gantt-style visualization where each task spans multiple time columns.

```sql
-- Expand scheduled maintenance windows into 15-minute slots
SELECT
    maintenance_id,
    resource_id,
    slot AS maintenance_slot
FROM maintenance_windows
ARRAY JOIN timeSlots(
    scheduled_start,
    toUInt32(dateDiff('second', scheduled_start, scheduled_end)),
    900  -- 15-minute slots
) AS slot
WHERE scheduled_date = today()
ORDER BY resource_id, maintenance_slot;
```

## Summary

`timeSlots(start, duration, slot_size)` generates an `Array(DateTime)` of slot boundaries covering a time interval. Its primary use is with `ARRAY JOIN` to explode event or session rows into per-slot rows, enabling aggregations like concurrent session counts and coverage heatmaps. The `slot_size` is specified in seconds, allowing any granularity from seconds to hours. For simple point-in-time bucketing without an interval, use `timeSlot` (singular) instead.
