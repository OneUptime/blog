# How to Find Consecutive Events with Window Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics, Lag, Streak Detection

Description: Detect consecutive event sequences like login streaks or error runs using LAG() for gap detection and ROW_NUMBER() minus a group counter to isolate streaks.

---

Detecting streaks, runs, and consecutive sequences is a classic analytics challenge. You want to know things like: which users logged in for five days in a row, or how many consecutive errors occurred before a service recovered. ClickHouse window functions - specifically `lag()` and a cumulative `sum()` - provide the building blocks for this pattern without needing recursive CTEs or procedural code.

## The Core Technique: Islands and Gaps

The standard approach is called the "islands and gaps" technique. The idea is:

1. Use `lag()` to detect when a sequence breaks (a gap).
2. Create a group identifier that increments each time a gap occurs.
3. Use a cumulative sum of gap flags to assign each consecutive run a unique group number.
4. Aggregate by the group to measure streak length.

```text
streak_group = sum(is_gap) OVER (PARTITION BY user ORDER BY event_date)
```

Every time `is_gap = 1`, the group number increases, marking the start of a new streak.

## Setting Up Login Data

```sql
CREATE TABLE user_logins
(
    user_id    UInt32,
    login_date Date
)
ENGINE = MergeTree()
ORDER BY (user_id, login_date);

INSERT INTO user_logins VALUES
    (1, '2024-01-01'),
    (1, '2024-01-02'),
    (1, '2024-01-03'),
    (1, '2024-01-05'),  -- gap here (skipped Jan 4)
    (1, '2024-01-06'),
    (1, '2024-01-07'),
    (1, '2024-01-08'),
    (2, '2024-01-01'),
    (2, '2024-01-03'),  -- gap here (skipped Jan 2)
    (2, '2024-01-04'),
    (2, '2024-01-05'),
    (2, '2024-01-06');
```

## Step 1 - Detect Gaps with LAG

Compare each login date to the previous login date. If the difference is more than 1 day, a gap exists.

```sql
SELECT
    user_id,
    login_date,
    lag(login_date, 1) OVER (
        PARTITION BY user_id
        ORDER BY login_date
    ) AS prev_login,
    dateDiff('day',
        lag(login_date, 1, login_date) OVER (
            PARTITION BY user_id
            ORDER BY login_date
        ),
        login_date
    ) AS days_since_prev,
    if(
        dateDiff('day',
            lag(login_date, 1, login_date) OVER (
                PARTITION BY user_id
                ORDER BY login_date
            ),
            login_date
        ) > 1,
        1,
        0
    ) AS is_gap
FROM user_logins
ORDER BY user_id, login_date;
```

The `lag()` third argument (default value) is set to `login_date` itself so the first row of each user reports 0 days since previous, preventing it from being incorrectly flagged as a gap.

## Step 2 - Assign Streak Groups

Accumulate `is_gap` using a running sum. Each time a gap is detected the group number increments, marking a new streak.

```sql
SELECT
    user_id,
    login_date,
    is_gap,
    sum(is_gap) OVER (
        PARTITION BY user_id
        ORDER BY login_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS streak_group
FROM (
    SELECT
        user_id,
        login_date,
        if(
            dateDiff('day',
                lag(login_date, 1, login_date) OVER (
                    PARTITION BY user_id
                    ORDER BY login_date
                ),
                login_date
            ) > 1,
            1,
            0
        ) AS is_gap
    FROM user_logins
)
ORDER BY user_id, login_date;
```

## Step 3 - Measure Streak Lengths

Group by `(user_id, streak_group)` to count the days in each consecutive run.

```sql
SELECT
    user_id,
    streak_group,
    min(login_date)             AS streak_start,
    max(login_date)             AS streak_end,
    count()                     AS streak_length_days
FROM (
    SELECT
        user_id,
        login_date,
        sum(is_gap) OVER (
            PARTITION BY user_id
            ORDER BY login_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS streak_group
    FROM (
        SELECT
            user_id,
            login_date,
            if(
                dateDiff('day',
                    lag(login_date, 1, login_date) OVER (
                        PARTITION BY user_id
                        ORDER BY login_date
                    ),
                    login_date
                ) > 1,
                1,
                0
            ) AS is_gap
        FROM user_logins
    )
)
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start;
```

User 1 should have two streaks: January 1-3 (3 days) and January 5-8 (4 days). User 2 should have two streaks: January 1 (1 day) and January 3-6 (4 days).

## Finding the Longest Streak per User

Filter to the longest streak per user using a subquery and max().

```sql
SELECT
    user_id,
    max(streak_length_days) AS longest_streak
FROM (
    SELECT
        user_id,
        count() AS streak_length_days
    FROM (
        SELECT
            user_id,
            login_date,
            sum(is_gap) OVER (
                PARTITION BY user_id
                ORDER BY login_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS streak_group
        FROM (
            SELECT
                user_id,
                login_date,
                if(
                    dateDiff('day',
                        lag(login_date, 1, login_date) OVER (
                            PARTITION BY user_id
                            ORDER BY login_date
                        ),
                        login_date
                    ) > 1,
                    1,
                    0
                ) AS is_gap
            FROM user_logins
        )
    )
    GROUP BY user_id, streak_group
)
GROUP BY user_id
ORDER BY user_id;
```

## Detecting Consecutive Errors

The same pattern applies to any ordered event log. Here is a setup for consecutive error detection.

```sql
CREATE TABLE service_events
(
    event_time DateTime,
    service    String,
    status     String  -- 'ok' or 'error'
)
ENGINE = MergeTree()
ORDER BY (service, event_time);

INSERT INTO service_events VALUES
    ('2024-01-01 10:00:00', 'api', 'ok'),
    ('2024-01-01 10:05:00', 'api', 'error'),
    ('2024-01-01 10:10:00', 'api', 'error'),
    ('2024-01-01 10:15:00', 'api', 'error'),
    ('2024-01-01 10:20:00', 'api', 'ok'),
    ('2024-01-01 10:25:00', 'api', 'error'),
    ('2024-01-01 10:30:00', 'api', 'error');
```

Detect runs of errors by treating a transition from 'ok' to 'error' (or from a different status) as a gap.

```sql
SELECT
    service,
    status,
    event_time,
    if(
        lag(status, 1, status) OVER (
            PARTITION BY service
            ORDER BY event_time
        ) != status,
        1,
        0
    ) AS status_changed,
    sum(
        if(
            lag(status, 1, status) OVER (
                PARTITION BY service
                ORDER BY event_time
            ) != status,
            1,
            0
        )
    ) OVER (
        PARTITION BY service
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS run_group
FROM service_events
ORDER BY service, event_time;
```

Each contiguous block of the same status gets the same `run_group` number. Aggregating on `(service, run_group)` with a `WHERE status = 'error'` gives you every consecutive error run and its length.

## Summary

Consecutive event detection in ClickHouse follows a two-step window function pattern. First, use `lag()` to identify where a sequence breaks, producing a boolean gap flag. Second, use a cumulative `sum()` of that flag to assign a monotonically increasing group number to each contiguous run. Aggregating by the group number then gives streak start, end, and length. This technique works for daily logins, hourly sensor readings, minute-level service statuses, or any ordered sequence where you need to identify uninterrupted runs.
