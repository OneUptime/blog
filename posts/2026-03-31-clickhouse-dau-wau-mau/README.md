# How to Calculate DAU, WAU, MAU in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DAU, WAU, MAU, User Analytics, Engagement

Description: Learn how to calculate Daily, Weekly, and Monthly Active Users in ClickHouse using uniqExact, bitmap functions, and rolling window aggregations.

---

## Active User Metrics

DAU, WAU, and MAU are the core engagement metrics for any product. ClickHouse's HyperLogLog and bitmap functions make these calculations efficient even across billions of events.

## Daily Active Users

Count distinct users who had at least one event per day:

```sql
SELECT
    toDate(event_time) AS day,
    uniq(user_id) AS dau
FROM user_events
WHERE event_time >= today() - 30
GROUP BY day
ORDER BY day;
```

Use `uniqExact` for precise counts on smaller datasets, `uniq` for approximate counts on billions of rows.

## Weekly Active Users

Count distinct users over a rolling 7-day window. Because window functions run after `GROUP BY`, we first aggregate per day into `uniqExactState` values and then combine them across the window with `uniqExactMerge`:

```sql
SELECT
    day,
    uniqExactMerge(state) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS wau
FROM (
    SELECT
        toDate(event_time) AS day,
        uniqExactState(user_id) AS state
    FROM user_events
    WHERE event_time >= today() - 60
    GROUP BY day
)
ORDER BY day;
```

## Monthly Active Users

Rolling 30-day MAU using the same state/merge pattern:

```sql
SELECT
    day,
    uniqMerge(state) OVER (
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS mau
FROM (
    SELECT
        toDate(event_time) AS day,
        uniqState(user_id) AS state
    FROM user_events
    WHERE event_time >= today() - 90
    GROUP BY day
)
ORDER BY day;
```

## DAU/MAU Ratio (Stickiness)

Stickiness measures what fraction of monthly users are active daily:

```sql
WITH
    dau AS (
        SELECT toDate(event_time) AS day, uniq(user_id) AS d
        FROM user_events GROUP BY day
    ),
    mau AS (
        SELECT
            day,
            uniqMerge(state) OVER (ORDER BY day ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS m
        FROM (
            SELECT toDate(event_time) AS day, uniqState(user_id) AS state
            FROM user_events GROUP BY day
        )
    )
SELECT
    dau.day,
    dau.d AS dau,
    mau.m AS mau,
    round(dau.d / mau.m * 100, 2) AS stickiness_pct
FROM dau JOIN mau ON dau.day = mau.day
ORDER BY dau.day;
```

## Calendar-Based MAU

For standard monthly counts (not rolling):

```sql
SELECT
    toYYYYMM(event_time) AS month,
    uniq(user_id) AS mau
FROM user_events
WHERE event_time >= toDate('2025-01-01')
GROUP BY month
ORDER BY month;
```

## New vs. Returning Users

Distinguish new users (first event) from returning users:

```sql
SELECT
    toDate(event_time) AS day,
    uniqExact(user_id) AS dau,
    uniqExactIf(user_id, is_new_user) AS new_users,
    uniqExact(user_id) - uniqExactIf(user_id, is_new_user) AS returning_users
FROM (
    SELECT *, min(event_time) OVER (PARTITION BY user_id) AS first_seen,
        toDate(event_time) = toDate(min(event_time) OVER (PARTITION BY user_id)) AS is_new_user
    FROM user_events
    WHERE event_time >= today() - 30
)
GROUP BY day
ORDER BY day;
```

## Summary

ClickHouse calculates DAU, WAU, and MAU using `uniq` and `uniqExact` with window functions over rolling day ranges. The DAU/MAU ratio measures stickiness, and combining first-event detection with daily counts separates new from returning users. These patterns form the foundation of product engagement dashboards.
