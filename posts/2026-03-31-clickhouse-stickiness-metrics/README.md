# How to Calculate Stickiness Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Stickiness, DAU, MAU, Engagement, Analytics

Description: Learn how to calculate product stickiness metrics in ClickHouse, including DAU/MAU ratio, L-days, and feature engagement frequency for retention analysis.

---

## What Is Product Stickiness

Stickiness measures how frequently users return to your product within a period. The most common metric is DAU/MAU, which shows what fraction of monthly active users engage daily. Higher stickiness indicates stronger habit formation and better long-term retention.

## DAU/MAU Ratio

The core stickiness metric:

```sql
WITH
    dau AS (
        SELECT toDate(event_time) AS day, uniq(user_id) AS daily_users
        FROM user_events
        WHERE event_time >= today() - 30
        GROUP BY day
    ),
    mau AS (
        SELECT uniq(user_id) AS monthly_users
        FROM user_events
        WHERE event_time >= today() - 30
    )
SELECT
    d.day,
    d.daily_users,
    m.monthly_users,
    round(d.daily_users / m.monthly_users * 100, 2) AS stickiness_pct
FROM dau d, mau m
ORDER BY d.day;
```

## L-Days (Activity Frequency)

L-days measures how many days in the past 28 days each user was active:

```sql
SELECT
    user_id,
    uniqExact(toDate(event_time)) AS active_days_last_28,
    CASE
        WHEN active_days_last_28 >= 21 THEN 'l21_plus'
        WHEN active_days_last_28 >= 14 THEN 'l14_to_20'
        WHEN active_days_last_28 >= 7 THEN 'l7_to_13'
        ELSE 'l1_to_6'
    END AS l_bucket
FROM user_events
WHERE event_time >= today() - 28
GROUP BY user_id;
```

## L-Day Distribution Over Time

Track how your L-day distribution changes month over month:

```sql
SELECT
    toYYYYMM(month_start) AS month,
    l_bucket,
    count() AS users
FROM (
    SELECT
        user_id,
        toStartOfMonth(event_time) AS month_start,
        CASE
            WHEN uniqExact(toDate(event_time)) >= 21 THEN 'l21_plus'
            WHEN uniqExact(toDate(event_time)) >= 14 THEN 'l14'
            WHEN uniqExact(toDate(event_time)) >= 7 THEN 'l7'
            ELSE 'l1'
        END AS l_bucket
    FROM user_events
    WHERE event_time >= toDate('2025-01-01')
    GROUP BY user_id, toStartOfMonth(event_time)
)
GROUP BY month, l_bucket
ORDER BY month, l_bucket;
```

## Feature Stickiness

Measure how often users who try a feature return to use it again:

```sql
SELECT
    feature_name,
    count(DISTINCT user_id) AS users_tried,
    countDistinctIf(user_id, usage_days >= 3) AS users_3x,
    round(countDistinctIf(user_id, usage_days >= 3) /
        count(DISTINCT user_id) * 100, 2) AS repeat_use_pct
FROM (
    SELECT
        user_id,
        feature_name,
        uniq(toDate(event_time)) AS usage_days
    FROM feature_events
    WHERE event_time >= today() - 30
    GROUP BY user_id, feature_name
)
GROUP BY feature_name
ORDER BY repeat_use_pct DESC;
```

## Weekly Stickiness Trend

Plot stickiness week over week:

```sql
SELECT
    toMonday(day) AS week,
    round(avg(stickiness_pct), 2) AS avg_weekly_stickiness
FROM (
    -- Insert DAU/MAU daily stickiness subquery here
    SELECT
        toDate(event_time) AS day,
        uniq(user_id) / (SELECT uniq(user_id) FROM user_events
            WHERE toDate(event_time) BETWEEN day - 29 AND day) * 100 AS stickiness_pct
    FROM user_events
    WHERE event_time >= today() - 90
    GROUP BY day
)
GROUP BY week
ORDER BY week;
```

## Summary

ClickHouse stickiness metrics include the DAU/MAU ratio, L-days frequency distribution, and feature-level repeat usage rates. Rolling window calculations expose how habit formation changes across cohorts and time. These metrics distinguish products users return to daily from those they use occasionally.
