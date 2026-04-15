# How to Use retention() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Retention, Cohort

Description: Compute cohort retention curves in ClickHouse using the retention() aggregate function, which returns a bitmask indicating which follow-up periods each user returned in.

---

Retention analysis measures how many users who performed an action in a baseline period came back to perform it again in subsequent periods. ClickHouse's `retention()` function encodes this as a bitmask, enabling you to compute day-N, week-N, or any custom retention curves in a single aggregation pass without multiple self-joins.

## Syntax

```sql
retention(cond1, cond2, cond3, ...)
```

- `cond1` - the baseline condition (e.g., active on day 0).
- `cond2, cond3, ...` - the follow-up conditions (e.g., active on day 1, day 7, day 30). Up to 32 conditions are supported.

The function returns `Array(UInt8)`. Element `[1]` is always 1 if `cond1` was true. Element `[i]` is 1 if both `cond1` AND `cond_i` were true, meaning the user satisfied both the baseline and the i-th follow-up condition.

## Setup

```sql
CREATE TABLE daily_activity
(
    user_id UInt32,
    activity_date Date
)
ENGINE = MergeTree()
ORDER BY (user_id, activity_date);

INSERT INTO daily_activity VALUES
    (1, '2024-01-01'), (1, '2024-01-02'), (1, '2024-01-08'),
    (2, '2024-01-01'), (2, '2024-01-03'),
    (3, '2024-01-01'), (3, '2024-01-02'), (3, '2024-01-03'), (3, '2024-01-08'),
    (4, '2024-01-02'), (4, '2024-01-03'),
    (5, '2024-01-01');
```

## Day-1 and Day-7 Retention

```sql
SELECT
    user_id,
    retention(
        activity_date = '2024-01-01',
        activity_date = '2024-01-02',
        activity_date = '2024-01-08'
    ) AS r
FROM daily_activity
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id | r
--------|----------
1       | [1, 1, 1]
2       | [1, 0, 0]
3       | [1, 1, 1]
4       | [0, 0, 0]
5       | [1, 0, 0]
```

User 4 did not appear on Jan 1 so their entire retention array is zeros. Users 1 and 3 came back on both Jan 2 and Jan 8.

## Aggregate Retention Rates Across Users

```sql
SELECT
    sum(r[1])                          AS cohort_size,
    sum(r[2])                          AS retained_day1,
    sum(r[3])                          AS retained_day7,
    round(sum(r[2]) * 100.0 / sum(r[1]), 1) AS day1_pct,
    round(sum(r[3]) * 100.0 / sum(r[1]), 1) AS day7_pct
FROM (
    SELECT
        user_id,
        retention(
            activity_date = '2024-01-01',
            activity_date = '2024-01-02',
            activity_date = '2024-01-08'
        ) AS r
    FROM daily_activity
    GROUP BY user_id
);
```

```text
cohort_size | retained_day1 | retained_day7 | day1_pct | day7_pct
------------|---------------|---------------|----------|--------
4           | 2             | 2             | 50.0     | 50.0
```

(4 users in the Jan 1 cohort; users 1 and 3 came back on both follow-up days.)

## Rolling Cohort Retention Table

Generate a full retention grid by using date arithmetic instead of hardcoded dates:

```sql
SELECT
    cohort_date,
    sum(r[1])  AS cohort_size,
    sum(r[2])  AS day1,
    sum(r[3])  AS day3,
    sum(r[4])  AS day7
FROM (
    SELECT
        user_id,
        min(activity_date)    AS cohort_date,
        retention(
            activity_date = min(activity_date),
            activity_date = min(activity_date) + 1,
            activity_date = min(activity_date) + 3,
            activity_date = min(activity_date) + 7
        ) AS r
    FROM daily_activity
    GROUP BY user_id
)
GROUP BY cohort_date
ORDER BY cohort_date;
```

### Note on Self-Reference

The inner query computes `min(activity_date)` as the cohort date. The `retention()` conditions reference this via a correlated expression. In practice you may need a subquery or CTE to materialize `cohort_date` first:

```sql
WITH user_cohorts AS (
    SELECT
        user_id,
        min(activity_date) AS cohort_date
    FROM daily_activity
    GROUP BY user_id
)
SELECT
    cohort_date,
    sum(r[1]) AS cohort_size,
    sum(r[2]) AS day1,
    sum(r[3]) AS day7
FROM (
    SELECT
        c.user_id,
        c.cohort_date,
        retention(
            a.activity_date = c.cohort_date,
            a.activity_date = c.cohort_date + 1,
            a.activity_date = c.cohort_date + 7
        ) AS r
    FROM user_cohorts c
    JOIN daily_activity a USING (user_id)
    GROUP BY c.user_id, c.cohort_date
)
GROUP BY cohort_date
ORDER BY cohort_date;
```

## Weekly Active User (WAU) Pattern

```sql
SELECT
    user_id,
    retention(
        toMonday(activity_date) = '2024-01-01',
        toMonday(activity_date) = '2024-01-08',
        toMonday(activity_date) = '2024-01-15',
        toMonday(activity_date) = '2024-01-22'
    ) AS weekly_retention
FROM daily_activity
GROUP BY user_id;
```

## Summary

`retention(cond1, cond2, ...)` returns a per-user bitmask array where each element indicates whether the user satisfied both the baseline condition and that follow-up condition. Aggregate with `sum(r[i])` to get cohort counts and divide by `sum(r[1])` for retention percentages. The function is especially powerful in rolling cohort queries where you define the follow-up conditions relative to each user's first activity date.
