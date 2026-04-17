# How to Calculate Average Revenue Per User (ARPU) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ARPU, Revenue, Analytics, SQL

Description: Calculate Average Revenue Per User in ClickHouse with time-based breakdowns, segment comparisons, and cohort-level ARPU tracking.

---

## ARPU Formula

ARPU = Total Revenue / Number of Active Users

The definition of "active" varies: it could mean users who logged in, users who made any purchase, or all registered users in a period.

## Table Schema

```sql
CREATE TABLE transactions (
    transaction_id UUID,
    user_id        UInt64,
    amount         Decimal(10, 2),
    currency       String,
    created_at     DateTime
) ENGINE = MergeTree()
ORDER BY (created_at, user_id);
```

## Monthly ARPU

```sql
SELECT
    toStartOfMonth(created_at)      AS month,
    sum(amount)                     AS total_revenue,
    uniq(user_id)                   AS active_users,
    round(sum(amount) / uniq(user_id), 2) AS arpu
FROM transactions
WHERE created_at >= toStartOfMonth(today()) - INTERVAL 12 MONTH
GROUP BY month
ORDER BY month;
```

## ARPU vs ARPPU (Average Revenue Per Paying User)

ARPPU considers only users who made a payment.

```sql
SELECT
    toStartOfMonth(created_at) AS month,
    -- ARPPU: revenue divided by paying users only (the user_id set in transactions)
    sum(amount) / uniq(user_id)     AS arppu,
    sum(amount)                     AS revenue,
    uniq(user_id)                   AS paying_users
    -- For true ARPU, divide `revenue` by total MAU from a users/events table
FROM transactions
GROUP BY month
ORDER BY month;
```

## ARPU by Plan or Segment

```sql
SELECT
    plan_name,
    toStartOfMonth(created_at) AS month,
    round(sum(amount) / uniq(t.user_id), 2) AS arpu
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE created_at >= today() - 90
GROUP BY plan_name, month
ORDER BY plan_name, month;
```

## Cumulative ARPU Over User Lifetime

```sql
WITH user_revenue AS (
    SELECT
        user_id,
        sum(amount)                AS lifetime_revenue,
        dateDiff('day', min(created_at), max(created_at)) AS active_days
    FROM transactions
    GROUP BY user_id
)
SELECT
    round(avg(lifetime_revenue), 2)   AS avg_ltv,
    round(avg(lifetime_revenue / greatest(active_days, 1)), 4) AS avg_daily_arpu
FROM user_revenue;
```

## Percentile Distribution of Revenue Per User

```sql
SELECT
    quantile(0.50)(total) AS p50,
    quantile(0.75)(total) AS p75,
    quantile(0.90)(total) AS p90,
    quantile(0.99)(total) AS p99
FROM (
    SELECT user_id, sum(amount) AS total
    FROM transactions
    WHERE created_at >= today() - 30
    GROUP BY user_id
);
```

## Summary

ClickHouse calculates ARPU efficiently using `sum(amount) / uniq(user_id)` per time bucket. Extend this with plan-level GROUP BY for segment comparisons, join with a users table for true MAU-based ARPU, and use quantile functions to understand revenue distribution beyond the average.
