# How to Find Consecutive Values in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Consecutive Values, Streak, Islands and Gaps, Window Function

Description: Learn how to find consecutive values and streaks in ClickHouse using the islands-and-gaps pattern with window functions to identify unbroken sequences.

---

## The Islands-and-Gaps Pattern

Finding consecutive values - user login streaks, consecutive days above a threshold, unbroken sequences - is solved with the "islands and gaps" technique. In ClickHouse this uses `row_number()` subtracted from a date or value to create a group key.

## Sample Daily Active Users Table

```sql
CREATE TABLE user_activity
(
    user_id UInt32,
    activity_date Date
)
ENGINE = MergeTree()
ORDER BY (user_id, activity_date);

INSERT INTO user_activity VALUES
(1, '2024-01-01'), (1, '2024-01-02'), (1, '2024-01-03'),
(1, '2024-01-05'), (1, '2024-01-06'),
(1, '2024-01-10'),
(2, '2024-01-01'), (2, '2024-01-02');
```

User 1 has streaks of 3, 2, and 1 day(s).

## Step 1 - Create the Group Key

Subtract the row number from the date. Consecutive dates produce the same difference:

```sql
SELECT
    user_id,
    activity_date,
    row_number() OVER (PARTITION BY user_id ORDER BY activity_date) AS rn,
    toDate(activity_date) - toIntervalDay(
        row_number() OVER (PARTITION BY user_id ORDER BY activity_date) - 1
    ) AS streak_group
FROM user_activity
ORDER BY user_id, activity_date;
```

## Step 2 - Aggregate Streaks

```sql
WITH streak_groups AS (
    SELECT
        user_id,
        activity_date,
        toDate(activity_date) - toIntervalDay(
            row_number() OVER (PARTITION BY user_id ORDER BY activity_date) - 1
        ) AS streak_group
    FROM user_activity
)
SELECT
    user_id,
    min(activity_date) AS streak_start,
    max(activity_date) AS streak_end,
    count() AS streak_length_days
FROM streak_groups
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start;
```

## Finding the Longest Streak Per User

```sql
WITH streaks AS (
    WITH streak_groups AS (
        SELECT
            user_id,
            toDate(activity_date) - toIntervalDay(
                row_number() OVER (PARTITION BY user_id ORDER BY activity_date) - 1
            ) AS streak_group
        FROM user_activity
    )
    SELECT
        user_id,
        count() AS streak_length
    FROM streak_groups
    GROUP BY user_id, streak_group
)
SELECT
    user_id,
    max(streak_length) AS longest_streak,
    count() AS total_streaks
FROM streaks
GROUP BY user_id
ORDER BY longest_streak DESC;
```

## Finding Consecutive Numbers

For integer sequences rather than dates:

```sql
SELECT
    value,
    value - row_number() OVER (ORDER BY value) AS group_key
FROM (VALUES (1), (2), (3), (5), (6), (7), (10)) AS t(value);
```

Group by `group_key` to identify runs of consecutive integers.

## Detecting Consecutive Errors in Logs

```sql
WITH log_data AS (
    SELECT
        service,
        log_time,
        is_error,
        row_number() OVER (PARTITION BY service ORDER BY log_time) AS rn,
        row_number() OVER (PARTITION BY service, is_error ORDER BY log_time) AS rn_per_status
    FROM logs
)
SELECT
    service,
    min(log_time) AS error_run_start,
    max(log_time) AS error_run_end,
    count() AS consecutive_errors
FROM log_data
WHERE is_error = 1
GROUP BY service, (rn - rn_per_status)
HAVING consecutive_errors >= 3
ORDER BY consecutive_errors DESC;
```

## Summary

The islands-and-gaps pattern in ClickHouse subtracts `row_number()` from a date or value to produce a stable group key for each consecutive run. Aggregate `min`, `max`, and `count` per group to find streak start, end, and length. This handles login streaks, sensor reading runs, and consecutive error detection.
