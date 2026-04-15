# How to Track Subscriber Activity Patterns in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Telecom, Subscriber Analytics, Churn, Segmentation

Description: Analyze telecom subscriber activity patterns in ClickHouse to understand usage habits, segment customers, and predict churn risk.

---

Understanding how subscribers use their plans is essential for product development, churn prevention, and targeted marketing. ClickHouse can process months of daily activity data across millions of subscribers to surface actionable behavioral patterns.

## Subscriber Activity Table

```sql
CREATE TABLE subscriber_activity (
    subscriber_id   UInt64,
    operator_id     UInt16,
    plan_id         UInt32,
    activity_date   Date,
    voice_mins      UInt32,
    sms_count       UInt32,
    data_mb         Float32,
    roaming_mb      Float32,
    top_up_amount   UInt32,   -- in cents, 0 if prepaid not topped up
    apps_used       UInt16,
    is_active       UInt8
) ENGINE = MergeTree()
ORDER BY (operator_id, subscriber_id, activity_date)
PARTITION BY toYYYYMM(activity_date);
```

## Monthly Active Subscribers

```sql
SELECT
    toYYYYMM(activity_date)           AS month,
    uniqExact(subscriber_id)          AS monthly_active,
    uniqExactIf(subscriber_id, data_mb > 0)   AS data_users,
    uniqExactIf(subscriber_id, voice_mins > 0) AS voice_users
FROM subscriber_activity
WHERE activity_date >= toStartOfMonth(today() - INTERVAL 6 MONTH)
GROUP BY month
ORDER BY month;
```

## Subscriber Segmentation by Usage

```sql
SELECT
    multiIf(
        avg_data_mb > 5000 AND avg_voice_mins > 500, 'heavy',
        avg_data_mb > 1000 OR  avg_voice_mins > 100, 'medium',
        avg_data_mb > 0   OR  avg_voice_mins > 0,   'light',
        'inactive'
    ) AS segment,
    count() AS subscribers
FROM (
    SELECT
        subscriber_id,
        avg(data_mb)    AS avg_data_mb,
        avg(voice_mins) AS avg_voice_mins
    FROM subscriber_activity
    WHERE activity_date >= today() - 30
    GROUP BY subscriber_id
)
GROUP BY segment;
```

## Churn Risk - 30-Day Inactivity

```sql
SELECT
    subscriber_id,
    max(activity_date) AS last_active,
    today() - max(activity_date) AS days_inactive
FROM subscriber_activity
WHERE subscriber_id IN (
    SELECT subscriber_id FROM subscriber_activity
    WHERE activity_date >= today() - 60   -- was active 2 months ago
)
GROUP BY subscriber_id
HAVING days_inactive > 30
ORDER BY days_inactive DESC
LIMIT 100;
```

## Weekly Usage Heatmap

```sql
SELECT
    toDayOfWeek(activity_date)         AS weekday,
    round(avg(data_mb), 1)             AS avg_data_mb,
    round(avg(voice_mins), 1)          AS avg_voice_mins
FROM subscriber_activity
WHERE activity_date >= today() - 90
GROUP BY weekday
ORDER BY weekday;
```

## Top Plans by Subscriber Count

```sql
SELECT
    plan_id,
    uniqExact(subscriber_id)           AS subscribers,
    round(avg(data_mb), 1)             AS avg_data_mb,
    round(avg(voice_mins), 1)          AS avg_voice_mins
FROM subscriber_activity
WHERE activity_date >= today() - 30
GROUP BY plan_id
ORDER BY subscribers DESC
LIMIT 10;
```

## Monthly Cohort Retention

```sql
SELECT
    a.first_month,
    a.months_since_join,
    round(100.0 * a.active_users / c.first_month_users, 1) AS retention_pct
FROM (
    SELECT
        toYYYYMM(cohort.first_activity) AS first_month,
        dateDiff('month', cohort.first_activity, sub.activity_date) AS months_since_join,
        uniqExact(sub.subscriber_id) AS active_users
    FROM subscriber_activity AS sub
    INNER JOIN (
        SELECT subscriber_id, min(activity_date) AS first_activity
        FROM subscriber_activity
        GROUP BY subscriber_id
    ) AS cohort USING (subscriber_id)
    WHERE sub.activity_date >= today() - 180
    GROUP BY first_month, months_since_join
) AS a
INNER JOIN (
    SELECT
        toYYYYMM(first_activity) AS first_month,
        count() AS first_month_users
    FROM (
        SELECT subscriber_id, min(activity_date) AS first_activity
        FROM subscriber_activity
        GROUP BY subscriber_id
    )
    GROUP BY first_month
) AS c USING (first_month)
ORDER BY a.first_month, a.months_since_join;
```

## Summary

ClickHouse enables telecom operators to build rich subscriber behavioral profiles from daily activity records. Segmentation queries run in seconds over millions of subscribers, cohort retention analysis highlights plan quality, and inactivity-based churn risk detection gives retention teams a head start on preventing subscriber loss.
