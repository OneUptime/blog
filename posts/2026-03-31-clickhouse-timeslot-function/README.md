# How to Use timeSlot() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Session Analysis, Analytics, Time Series

Description: Learn how timeSlot() rounds a DateTime down to the nearest 30-minute boundary, enabling consistent session bucketing and time-series aggregation.

---

`timeSlot(dt)` is a ClickHouse function that truncates a DateTime value to the nearest 30-minute boundary. It is equivalent to rounding down to the nearest half-hour: timestamps between `HH:00:00` and `HH:29:59` map to `HH:00:00`, and timestamps between `HH:30:00` and `HH:59:59` map to `HH:30:00`. This makes it simple to create consistent time buckets for session analysis, dashboards, and operational metrics without writing custom floor arithmetic.

## Basic Usage

```sql
-- Show how timeSlot rounds various timestamps
SELECT
    toDateTime('2024-06-15 14:07:43') AS raw,
    timeSlot(toDateTime('2024-06-15 14:07:43')) AS slot_1,
    timeSlot(toDateTime('2024-06-15 14:31:00')) AS slot_2,
    timeSlot(toDateTime('2024-06-15 14:59:59')) AS slot_3;
```

```text
raw                     slot_1                  slot_2                  slot_3
2024-06-15 14:07:43     2024-06-15 14:00:00     2024-06-15 14:30:00     2024-06-15 14:30:00
```

All three afternoon timestamps fall into one of two 30-minute buckets.

## Aggregating Events Into 30-Minute Windows

The most common use of `timeSlot` is grouping event data into half-hour buckets for time-series charts.

```sql
-- Count page views per 30-minute slot
SELECT
    timeSlot(event_time) AS slot,
    count() AS page_views,
    uniq(user_id) AS unique_visitors
FROM page_events
WHERE event_date >= today() - 7
GROUP BY slot
ORDER BY slot;
```

## Session Analysis

Sessions are often defined as groups of events separated by less than 30 minutes. `timeSlot` provides a natural way to assign all activity within a half-hour window to the same session bucket.

```sql
-- Assign each event to a session slot and count events per session
SELECT
    user_id,
    timeSlot(event_time) AS session_slot,
    count() AS events_in_slot,
    min(event_time) AS first_event,
    max(event_time) AS last_event
FROM user_events
WHERE event_date = today()
GROUP BY user_id, session_slot
ORDER BY user_id, session_slot;
```

## Finding Peak Activity Windows

With half-hour buckets, you can identify peak traffic periods across days by aggregating by the time-of-day portion of the slot.

```sql
-- Find average events per 30-minute window across all days
SELECT
    formatDateTime(slot, '%H:%M') AS time_of_day,
    avg(daily_events) AS avg_events
FROM (
    SELECT
        toDate(event_time) AS event_day,
        timeSlot(event_time) AS slot,
        count() AS daily_events
    FROM events
    WHERE event_date >= today() - 30
    GROUP BY event_day, slot
)
GROUP BY time_of_day
ORDER BY time_of_day;
```

## Comparing timeSlot to Manual Floor Arithmetic

You could replicate `timeSlot` manually using integer division, but the function is cleaner and avoids type conversion errors.

```sql
-- Manual equivalent using toUnixTimestamp arithmetic
SELECT
    event_time,
    -- Manual approach
    toDateTime(
        intDiv(toUnixTimestamp(event_time), 1800) * 1800
    ) AS manual_slot,
    -- Function approach
    timeSlot(event_time) AS function_slot
FROM events
LIMIT 5;
```

Both produce the same result. Use `timeSlot` for readability.

## Using timeSlot as a Materialized Column

If your workload involves frequent 30-minute aggregations, storing the slot as a materialized column avoids recomputing it at query time.

```sql
CREATE TABLE events_with_slots
(
    event_id    UInt64,
    user_id     UInt64,
    event_time  DateTime,
    event_slot  DateTime MATERIALIZED timeSlot(event_time)
)
ENGINE = MergeTree()
ORDER BY (event_slot, user_id);
```

Queries filtering on `event_slot` can then use the sort order for efficient range scans.

## Combining timeSlot with Window Functions

`timeSlot` works well as the partition or order key in window function queries to compute metrics within rolling half-hour windows.

```sql
-- Running total of events within each 30-minute slot per user
SELECT
    user_id,
    event_time,
    timeSlot(event_time) AS slot,
    count() OVER (
        PARTITION BY user_id, timeSlot(event_time)
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS events_so_far_in_slot
FROM user_events
WHERE event_date = today()
ORDER BY user_id, event_time;
```

## Summary

`timeSlot(dt)` rounds any DateTime down to the nearest 30-minute boundary, producing a consistent bucket that is ideal for session aggregation, traffic analysis, and half-hour interval reporting. It is simpler than manual floor arithmetic and integrates naturally with `GROUP BY`, materialized columns, and window functions. For custom slot sizes beyond 30 minutes, consider `toStartOfInterval` which accepts an arbitrary interval argument.
