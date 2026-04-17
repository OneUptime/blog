# How to Build Cohort Analysis Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cohort Analysis, Retention, Analytics, Product

Description: Learn how to build cohort analysis queries in ClickHouse to track user retention, engagement trends, and behavioral patterns over time.

---

## What Is Cohort Analysis?

Cohort analysis groups users by a shared characteristic - usually the time they first performed an action - and tracks their behavior over subsequent periods. It is the foundation of retention analysis and helps product teams understand whether improvements are making users stick around.

## Setting Up the Data Model

Assume you have an events table:

```sql
CREATE TABLE user_events
(
    user_id     UInt64,
    event_type  String,
    created_at  DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, created_at);
```

## Finding Each User's Cohort (First Active Month)

```sql
WITH user_cohorts AS (
    SELECT
        user_id,
        toStartOfMonth(min(created_at)) AS cohort_month
    FROM user_events
    WHERE event_type = 'signup'
    GROUP BY user_id
)
SELECT cohort_month, count() AS cohort_size
FROM user_cohorts
GROUP BY cohort_month
ORDER BY cohort_month;
```

## Computing Monthly Retention

```sql
WITH
user_cohorts AS (
    SELECT user_id, toStartOfMonth(min(created_at)) AS cohort_month
    FROM user_events WHERE event_type = 'signup'
    GROUP BY user_id
),
user_activity AS (
    SELECT DISTINCT user_id, toStartOfMonth(created_at) AS active_month
    FROM user_events
)
SELECT
    c.cohort_month,
    dateDiff('month', c.cohort_month, a.active_month) AS period,
    count(DISTINCT a.user_id) AS retained_users
FROM user_cohorts c
JOIN user_activity a ON c.user_id = a.user_id
WHERE a.active_month >= c.cohort_month
GROUP BY c.cohort_month, period
ORDER BY c.cohort_month, period;
```

## Calculating Retention Rate

```sql
WITH
cohort_sizes AS (
    SELECT user_id, toStartOfMonth(min(created_at)) AS cohort_month
    FROM user_events WHERE event_type = 'signup'
    GROUP BY user_id
),
sizes AS (
    SELECT cohort_month, count() AS cohort_size
    FROM cohort_sizes GROUP BY cohort_month
),
retained AS (
    SELECT
        c.cohort_month,
        dateDiff('month', c.cohort_month, toStartOfMonth(e.created_at)) AS period,
        count(DISTINCT e.user_id) AS retained
    FROM cohort_sizes c
    JOIN user_events e ON c.user_id = e.user_id
    WHERE e.created_at >= c.cohort_month
    GROUP BY c.cohort_month, period
)
SELECT
    r.cohort_month,
    r.period,
    r.retained,
    s.cohort_size,
    round(100.0 * r.retained / s.cohort_size, 1) AS retention_pct
FROM retained r
JOIN sizes s ON r.cohort_month = s.cohort_month
ORDER BY r.cohort_month, r.period;
```

## Using retention Function

ClickHouse also provides a `retention` aggregate function that takes multiple `UInt8` conditions evaluated per row. The first condition is the base event; subsequent elements of the result are 1 only if the first condition and that condition both held for the user:

```sql
SELECT
    user_id,
    retention(
        event_type = 'signup',
        event_type = 'purchase'
    ) AS retention_flags
FROM user_events
GROUP BY user_id;
```

## Summary

ClickHouse handles cohort analysis well because its columnar storage and aggregate functions process large event tables efficiently. Define cohorts using `min()` grouped by user, join back to the events table to measure activity in subsequent periods, and compute retention rates in a single query. The `retention` aggregate function simplifies multi-step funnel retention in a compact form.
