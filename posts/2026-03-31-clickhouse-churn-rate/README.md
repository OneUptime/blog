# How to Calculate Churn Rate in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Churn Rate, Retention, Analytics, SQL

Description: Calculate monthly customer churn rate in ClickHouse by comparing active users across consecutive periods to identify who stopped engaging.

---

## Churn Rate Formula

Monthly Churn Rate = (Customers Lost in Month / Customers at Start of Month) * 100

## Schema Assumptions

```sql
CREATE TABLE subscriptions (
    user_id    UInt64,
    status     String,    -- 'active', 'cancelled', 'expired'
    start_date Date,
    end_date   Date       -- NULL or far future for active subs
) ENGINE = MergeTree()
ORDER BY (user_id, start_date);
```

## Monthly Active Users Per Period

```sql
WITH monthly_active AS (
    SELECT
        toStartOfMonth(month_date) AS month,
        groupArrayDistinct(user_id) AS active_users
    FROM (
        SELECT
            user_id,
            arrayJoin(
                arrayMap(
                    m -> toDate(toStartOfMonth(start_date)) + toIntervalMonth(m),
                    range(toUInt32(dateDiff('month', start_date, end_date) + 1))
                )
            ) AS month_date
        FROM subscriptions
        WHERE status = 'active' OR end_date >= today() - 365
    )
    GROUP BY month
)
SELECT month, length(active_users) AS active_count
FROM monthly_active
ORDER BY month;
```

## Simpler Approach - Event-Based Active Users

If you track logins or usage events, define "active" as any activity in the month.

```sql
WITH monthly_actives AS (
    SELECT
        toStartOfMonth(ts) AS month,
        groupArrayDistinct(user_id) AS users
    FROM events
    WHERE ts >= today() - INTERVAL 3 MONTH
    GROUP BY month
    ORDER BY month
),
consecutive AS (
    SELECT
        month,
        users,
        lagInFrame(users) OVER (ORDER BY month) AS prev_users
    FROM monthly_actives
)
SELECT
    month,
    length(users)                  AS active_count,
    length(prev_users)             AS prev_count,
    length(arrayIntersect(prev_users, users))  AS retained,
    length(prev_users) - length(arrayIntersect(prev_users, users)) AS churned,
    round(
        (length(prev_users) - length(arrayIntersect(prev_users, users)))
        * 100.0 / length(prev_users),
        2
    ) AS churn_rate_pct
FROM consecutive
WHERE notEmpty(prev_users);
```

## Revenue Churn Rate (MRR Churn)

```sql
WITH monthly_mrr AS (
    SELECT
        toStartOfMonth(created_at) AS month,
        user_id,
        sum(amount) AS mrr
    FROM transactions
    GROUP BY month, user_id
),
churn_mrr AS (
    SELECT
        prev.month + INTERVAL 1 MONTH AS month,
        sumIf(prev.mrr, curr.user_id IS NULL)    AS lost_mrr,
        sum(prev.mrr)                             AS start_mrr
    FROM monthly_mrr prev
    LEFT JOIN monthly_mrr curr
        ON prev.user_id = curr.user_id
        AND curr.month = prev.month + INTERVAL 1 MONTH
    GROUP BY prev.month + INTERVAL 1 MONTH
)
SELECT month, round(lost_mrr * 100.0 / start_mrr, 2) AS mrr_churn_pct
FROM churn_mrr
ORDER BY month
SETTINGS join_use_nulls = 1;
```

## Summary

ClickHouse calculates churn by comparing user sets between consecutive months using `arrayIntersect` and `lagInFrame`. For revenue churn, join monthly MRR tables and compute the fraction of lost MRR. Define "active" based on your product context - subscriptions, usage events, or purchases.
