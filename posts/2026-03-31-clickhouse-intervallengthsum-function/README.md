# How to Use intervalLengthSum() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, intervalLengthSum, Time Series, Session

Description: Learn how intervalLengthSum() computes the total length of the union of intervals, handling overlaps correctly - perfect for active time and session analytics.

---

Computing how long something was active is harder than it looks when activity periods can overlap. If a user was on your site from 10:00 to 10:30 and also from 10:15 to 10:45, their total active time is 45 minutes - not 60. Naively summing `end - start` for each interval double-counts the overlapping portion. `intervalLengthSum()` solves this correctly: it takes a set of `[begin, end)` intervals and returns the total length of their union, accounting for all overlaps and gaps automatically. This makes it the right tool for session length analytics, active time computation, and any problem that requires measuring coverage of a time range.

## Syntax

```text
intervalLengthSum(begin, end)
```

- `begin` - start of each interval (inclusive). Accepts `DateTime`, `DateTime64`, `Date`, or numeric types.
- `end` - end of each interval (exclusive). Must be the same type as `begin`.

The function returns the total length of the union of all intervals in the group. The unit of the result matches the unit of the input type (seconds for `DateTime`, days for `Date`, etc.).

## Understanding Union Length with a Simple Example

Start with a hand-crafted example to see overlap handling clearly.

```sql
SELECT intervalLengthSum(begin, end) AS union_length
FROM (
    SELECT toDateTime('2026-03-31 10:00:00') AS begin,
           toDateTime('2026-03-31 10:30:00') AS end
    UNION ALL
    SELECT toDateTime('2026-03-31 10:15:00'),
           toDateTime('2026-03-31 10:45:00')
    UNION ALL
    SELECT toDateTime('2026-03-31 11:00:00'),
           toDateTime('2026-03-31 11:20:00')
);
```

```text
union_length
3900
```

The first two intervals overlap from 10:15 to 10:30 (15 minutes of overlap), so their union spans 10:00 to 10:45 (45 minutes). The third interval adds 20 minutes with no overlap, giving 65 minutes total = 3900 seconds.

## Setting Up a Session Analytics Table

Create a table tracking user activity windows - each row represents one continuous activity session (e.g., a video watch segment, an editor session, or a WebSocket connection).

```sql
CREATE TABLE activity_windows
(
    user_id    UInt32,
    session_id String,
    started_at DateTime,
    ended_at   DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, started_at);

INSERT INTO activity_windows VALUES
    -- User 1: two overlapping windows and one separate window
    (1, 'a1', '2026-03-31 09:00:00', '2026-03-31 09:30:00'),
    (1, 'a2', '2026-03-31 09:20:00', '2026-03-31 09:50:00'),  -- overlaps a1
    (1, 'a3', '2026-03-31 10:30:00', '2026-03-31 11:00:00'),  -- no overlap

    -- User 2: three overlapping windows
    (2, 'b1', '2026-03-31 10:00:00', '2026-03-31 10:45:00'),
    (2, 'b2', '2026-03-31 10:30:00', '2026-03-31 11:15:00'),  -- overlaps b1
    (2, 'b3', '2026-03-31 11:00:00', '2026-03-31 11:30:00'),  -- overlaps b2

    -- User 3: non-overlapping windows
    (3, 'c1', '2026-03-31 08:00:00', '2026-03-31 08:20:00'),
    (3, 'c2', '2026-03-31 09:00:00', '2026-03-31 09:40:00'),
    (3, 'c3', '2026-03-31 11:00:00', '2026-03-31 11:10:00');
```

## Computing Total Active Time per User

```sql
SELECT
    user_id,
    intervalLengthSum(started_at, ended_at)      AS active_seconds,
    intervalLengthSum(started_at, ended_at) / 60 AS active_minutes,
    count()                                      AS window_count
FROM activity_windows
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id  active_seconds  active_minutes  window_count
1        4800            80              3
2        5400            90              3
3        4200            70              3
```

For user 1: a1 (09:00-09:30 = 30min) union a2 (09:20-09:50 = 30min) = 09:00-09:50 = 50min, plus a3 (10:30-11:00 = 30min) = 80min = 4800s. The overlapping portion (09:20-09:30 = 10min) is correctly counted once. For user 3: 20 + 40 + 10 = 70min = 4200s (no overlaps).

## Comparing intervalLengthSum() to Naive Sum

The difference between correct overlap-aware computation and naive summation:

```sql
SELECT
    user_id,
    -- Naive: sums all (end - start) including overlaps
    sum(dateDiff('second', started_at, ended_at)) / 60 AS naive_minutes,
    -- Correct: union of intervals
    intervalLengthSum(started_at, ended_at) / 60       AS correct_minutes
FROM activity_windows
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id  naive_minutes  correct_minutes
1        90             80
2        120            90
3        70             70
```

User 1's naive sum overcounts by 10 minutes (the overlap between a1 and a2 is 09:20-09:30). User 2 overcounts by 30 minutes due to cascading overlaps. User 3 has no overlaps so both methods agree.

## Video Streaming: Watched Duration

A practical application is computing how much of a video a user actually watched, accounting for replays (which create overlapping intervals).

```sql
CREATE TABLE video_watch_events
(
    user_id   UInt32,
    video_id  String,
    -- playback position in seconds
    pos_start Float64,
    pos_end   Float64
)
ENGINE = MergeTree()
ORDER BY (user_id, video_id);

INSERT INTO video_watch_events VALUES
    -- User watched 0-60s, then rewound and watched 45-120s
    (1, 'v1', 0.0,  60.0),
    (1, 'v1', 45.0, 120.0),
    -- User watched without rewinding
    (2, 'v1', 0.0,  90.0),
    (2, 'v1', 90.0, 180.0);

SELECT
    user_id,
    video_id,
    intervalLengthSum(pos_start, pos_end)  AS unique_seconds_watched,
    sum(pos_end - pos_start)               AS total_play_seconds
FROM video_watch_events
GROUP BY user_id, video_id
ORDER BY user_id, video_id;
```

```text
user_id  video_id  unique_seconds_watched  total_play_seconds
1        v1        120                     135
2        v1        180                     180
```

User 1 rewatched 15 seconds (45s to 60s), so their unique watched duration is 120s, not 135s. User 2 watched sequentially so both methods agree.

## Using DateTime64 for Sub-Second Precision

For high-frequency data (real-time bidding, audio playback, microsecond logging), use `DateTime64`:

```sql
CREATE TABLE realtime_spans
(
    trace_id  String,
    span_id   String,
    start_ns  DateTime64(9),  -- nanosecond precision
    end_ns    DateTime64(9)
)
ENGINE = MergeTree()
ORDER BY (trace_id, start_ns);

INSERT INTO realtime_spans VALUES
    ('t1', 'span-a', '2026-03-31 10:00:00.000100000', '2026-03-31 10:00:00.000500000'),
    ('t1', 'span-b', '2026-03-31 10:00:00.000300000', '2026-03-31 10:00:00.000800000'),
    ('t1', 'span-c', '2026-03-31 10:00:00.001000000', '2026-03-31 10:00:00.001500000');

SELECT
    trace_id,
    -- Result is in nanoseconds for DateTime64(9)
    intervalLengthSum(start_ns, end_ns) AS active_ns,
    intervalLengthSum(start_ns, end_ns) / 1e6 AS active_ms
FROM realtime_spans
GROUP BY trace_id;
```

## Daily Active Time Report

Combine with date bucketing to produce a daily active time report:

```sql
SELECT
    user_id,
    toDate(started_at)                           AS activity_date,
    intervalLengthSum(started_at, ended_at) / 60 AS active_minutes_that_day
FROM activity_windows
GROUP BY user_id, activity_date
ORDER BY user_id, activity_date;
```

## Summary

`intervalLengthSum()` computes the total length of the union of a set of intervals, handling overlaps and nested intervals correctly. Use it whenever you need to measure how long something was active without double-counting overlapping periods. It accepts `DateTime`, `DateTime64`, `Date`, and numeric types. The result unit matches the input type (seconds for `DateTime`, nanoseconds for `DateTime64(9)`, etc.). Common applications include session analytics, video watch time, billing for active usage periods, and distributed tracing where spans can overlap.
