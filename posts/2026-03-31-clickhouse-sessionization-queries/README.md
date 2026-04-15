# How to Implement Sessionization Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sessionization, Analytics, Window Function, User Behavior

Description: Learn how to implement sessionization queries in ClickHouse to group user events into sessions using time-based gaps and window functions.

---

## What is Sessionization?

Sessionization is the process of grouping a stream of user events into discrete sessions based on inactivity gaps. For example, if a user has no activity for 30 minutes, the next event starts a new session.

ClickHouse supports sessionization through window functions and conditional aggregation. This pattern is common in web analytics, mobile app tracking, and behavioral analysis.

## Setting Up Sample Data

```sql
CREATE TABLE user_events
(
    user_id UInt64,
    event_time DateTime,
    event_type String
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

INSERT INTO user_events VALUES
(1, '2024-01-01 10:00:00', 'page_view'),
(1, '2024-01-01 10:05:00', 'click'),
(1, '2024-01-01 10:08:00', 'page_view'),
(1, '2024-01-01 11:00:00', 'page_view'),
(1, '2024-01-01 11:03:00', 'purchase'),
(2, '2024-01-01 09:00:00', 'page_view'),
(2, '2024-01-01 09:45:00', 'click');
```

## Detecting Session Boundaries

The first step is identifying where new sessions begin. A new session starts when the gap from the previous event exceeds 30 minutes:

```sql
SELECT
    user_id,
    event_time,
    event_type,
    if(
        dateDiff('minute',
            lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
            event_time
        ) > 30 OR lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL,
        1, 0
    ) AS is_new_session
FROM user_events
ORDER BY user_id, event_time;
```

## Assigning Session IDs

Once boundaries are identified, use a cumulative sum to assign session IDs:

```sql
WITH session_flags AS (
    SELECT
        user_id,
        event_time,
        event_type,
        if(
            dateDiff('minute',
                lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
                event_time
            ) > 30 OR lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL,
            1, 0
        ) AS is_new_session
    FROM user_events
)
SELECT
    user_id,
    event_time,
    event_type,
    sum(is_new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id
FROM session_flags
ORDER BY user_id, event_time;
```

## Aggregating Session Metrics

With session IDs assigned, you can compute per-session metrics:

```sql
WITH sessions AS (
    WITH session_flags AS (
        SELECT
            user_id, event_time, event_type,
            if(
                dateDiff('minute',
                    lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
                    event_time
                ) > 30 OR lagInFrame(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL,
                1, 0
            ) AS is_new_session
        FROM user_events
    )
    SELECT
        user_id, event_time, event_type,
        sum(is_new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id
    FROM session_flags
)
SELECT
    user_id,
    session_id,
    min(event_time) AS session_start,
    max(event_time) AS session_end,
    dateDiff('minute', min(event_time), max(event_time)) AS duration_minutes,
    count() AS event_count
FROM sessions
GROUP BY user_id, session_id
ORDER BY user_id, session_id;
```

## Using windowFunnel for Conversion Tracking

ClickHouse also provides the `windowFunnel` aggregate function for tracking how far users progress through a sequence of events within a specified time window:

```sql
SELECT
    user_id,
    windowFunnel(3600)(event_time,
        event_type = 'page_view',
        event_type = 'click',
        event_type = 'purchase'
    ) AS funnel_stage
FROM user_events
GROUP BY user_id;
```

## Summary

Sessionization in ClickHouse uses window functions to detect inactivity gaps and assign session IDs via cumulative sums. By chaining CTEs you can compute rich per-session metrics and combine the result with funnel functions for conversion analysis.
