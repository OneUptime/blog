# How to Analyze Onboarding Funnel Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Onboarding Funnel, Conversion, Product Analytics, Step Completion

Description: Learn how to track user progression through onboarding steps in ClickHouse and identify where drop-off occurs in the activation funnel.

---

Onboarding funnels determine whether new users reach their "aha moment" before churning. ClickHouse's event-level storage and window functions make it easy to track step-by-step completion rates, time-to-complete, and drop-off points across signup cohorts.

## Schema

```sql
CREATE TABLE onboarding_events
(
    ts          DateTime,
    user_id     UInt64,
    step        LowCardinality(String), -- 'signup','email_verified','profile_setup','first_project','invite_sent','first_value'
    completed   UInt8,
    plan        LowCardinality(String),
    signup_date Date
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (user_id, step, ts);
```

## Overall Funnel Completion Rates

```sql
SELECT
    step,
    uniqExact(user_id) AS users_reached,
    uniqExact(user_id) * 100.0 / (
        SELECT uniqExact(user_id) FROM onboarding_events WHERE step = 'signup'
    ) AS pct_of_signups
FROM onboarding_events
WHERE completed = 1
GROUP BY step
ORDER BY users_reached DESC;
```

## Step-by-Step Drop-off

```sql
WITH steps AS (
    SELECT step, uniqExact(user_id) AS users
    FROM onboarding_events
    WHERE completed = 1
    GROUP BY step
),
ordered AS (
    SELECT
        step,
        users,
        lagInFrame(users) OVER (ORDER BY users DESC) AS prev_users
    FROM steps
)
SELECT
    step,
    users,
    prev_users,
    (prev_users - users) * 100.0 / (prev_users + 1) AS drop_off_pct
FROM ordered;
```

## Time to Complete Each Step

```sql
SELECT
    step,
    quantile(0.5)(dateDiff('hour', toDateTime(signup_date), ts))  AS median_hours,
    quantile(0.9)(dateDiff('hour', toDateTime(signup_date), ts))  AS p90_hours
FROM onboarding_events
WHERE completed = 1
GROUP BY step
ORDER BY median_hours;
```

## Cohort Funnel Completion by Week

```sql
SELECT
    toStartOfWeek(signup_date) AS cohort_week,
    countIf(step = 'signup')       AS signups,
    countIf(step = 'first_value')  AS activated
FROM onboarding_events
WHERE completed = 1
GROUP BY cohort_week
ORDER BY cohort_week;
```

## Users Stuck at Each Step

Find users who started a step but never completed it:

```sql
SELECT
    step,
    uniqExact(user_id) AS stuck_users
FROM onboarding_events
WHERE completed = 0
  AND (user_id, step) NOT IN (
      SELECT user_id, step FROM onboarding_events WHERE completed = 1
  )
GROUP BY step
ORDER BY stuck_users DESC;
```

## Funnel Performance by Plan

```sql
SELECT
    plan,
    step,
    countIf(completed = 1) AS completions
FROM onboarding_events
WHERE signup_date >= today() - 30
GROUP BY plan, step
ORDER BY plan, completions DESC;
```

## Summary

ClickHouse handles onboarding funnel analysis well by combining event-level storage with flexible aggregation. Measure step completion rates, compute time-to-complete each stage, and segment drop-off by cohort week or plan tier. Use these insights to focus product improvements on the steps where most users abandon the activation journey.
