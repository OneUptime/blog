# How to Use ClickHouse for Funnel and Cohort Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Analytics, Funnel Analysis, Cohort Analysis, User Analytics, windowFunnel, retention, Product Analytics

Description: A practical guide to implementing funnel and cohort analysis in ClickHouse using windowFunnel, retention functions, and SQL patterns for tracking user conversion and retention metrics.

---

ClickHouse has built-in functions for funnel and cohort analysis that make product analytics queries both simple and fast. This guide covers how to use windowFunnel, retention, and related functions to analyze user behavior.

## Funnel Analysis Basics

### Understanding windowFunnel

The `windowFunnel` function finds the maximum completed step in a sequence of events within a time window.

```sql
-- Basic funnel: Sign up -> Add to cart -> Purchase
SELECT
    windowFunnel(86400)(  -- 24-hour window
        event_time,
        event_type = 'signup',
        event_type = 'add_to_cart',
        event_type = 'purchase'
    ) AS funnel_step
FROM events
WHERE user_id = 12345
  AND event_time >= '2024-01-01'
  AND event_time < '2024-02-01';
```

### Aggregated Funnel Report

```sql
-- Count users at each funnel step
SELECT
    step,
    count() AS users,
    round(users / max(users) OVER () * 100, 2) AS conversion_pct
FROM (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view_product',
            event_type = 'add_to_cart',
            event_type = 'start_checkout',
            event_type = 'purchase'
        ) AS step
    FROM events
    WHERE event_time >= '2024-01-01'
      AND event_time < '2024-02-01'
    GROUP BY user_id
)
GROUP BY step
ORDER BY step;
```

### Step-by-Step Conversion

```sql
-- Conversion between each step
WITH funnel AS (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view_product',
            event_type = 'add_to_cart',
            event_type = 'start_checkout',
            event_type = 'purchase'
        ) AS max_step
    FROM events
    WHERE event_time >= '2024-01-01'
      AND event_time < '2024-02-01'
    GROUP BY user_id
)
SELECT
    countIf(max_step >= 1) AS step_1_view,
    countIf(max_step >= 2) AS step_2_cart,
    countIf(max_step >= 3) AS step_3_checkout,
    countIf(max_step >= 4) AS step_4_purchase,
    round(step_2_cart / step_1_view * 100, 2) AS conv_1_to_2,
    round(step_3_checkout / step_2_cart * 100, 2) AS conv_2_to_3,
    round(step_4_purchase / step_3_checkout * 100, 2) AS conv_3_to_4,
    round(step_4_purchase / step_1_view * 100, 2) AS overall_conv
FROM funnel;
```

## Advanced Funnel Patterns

### Funnel with Conditions

```sql
-- Funnel with specific product category
SELECT
    step,
    count() AS users
FROM (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view_product' AND category = 'electronics',
            event_type = 'add_to_cart' AND category = 'electronics',
            event_type = 'purchase' AND category = 'electronics'
        ) AS step
    FROM events
    WHERE event_time >= '2024-01-01'
      AND event_time < '2024-02-01'
    GROUP BY user_id
)
GROUP BY step
ORDER BY step;
```

### Funnel by Segment

```sql
-- Funnel by acquisition source
SELECT
    acquisition_source,
    step,
    count() AS users,
    round(users / max(users) OVER (PARTITION BY acquisition_source) * 100, 2) AS pct
FROM (
    SELECT
        user_id,
        any(acquisition_source) AS acquisition_source,
        windowFunnel(86400)(
            event_time,
            event_type = 'signup',
            event_type = 'first_action',
            event_type = 'conversion'
        ) AS step
    FROM events
    WHERE event_time >= '2024-01-01'
      AND event_time < '2024-02-01'
    GROUP BY user_id
)
GROUP BY acquisition_source, step
ORDER BY acquisition_source, step;
```

### Time-to-Convert Analysis

```sql
-- Measure time between funnel steps
SELECT
    user_id,
    min(if(event_type = 'signup', event_time, null)) AS signup_time,
    min(if(event_type = 'first_purchase', event_time, null)) AS purchase_time,
    dateDiff('hour', signup_time, purchase_time) AS hours_to_convert
FROM events
WHERE event_type IN ('signup', 'first_purchase')
  AND event_time >= '2024-01-01'
  AND event_time < '2024-02-01'
GROUP BY user_id
HAVING signup_time IS NOT NULL AND purchase_time IS NOT NULL;

-- Distribution of conversion times
SELECT
    multiIf(
        hours_to_convert < 1, '< 1 hour',
        hours_to_convert < 24, '1-24 hours',
        hours_to_convert < 168, '1-7 days',
        '> 7 days'
    ) AS time_bucket,
    count() AS users
FROM (
    SELECT
        user_id,
        dateDiff('hour',
            min(if(event_type = 'signup', event_time, null)),
            min(if(event_type = 'first_purchase', event_time, null))
        ) AS hours_to_convert
    FROM events
    WHERE event_type IN ('signup', 'first_purchase')
    GROUP BY user_id
    HAVING hours_to_convert IS NOT NULL
)
GROUP BY time_bucket
ORDER BY time_bucket;
```

## Cohort Analysis

### Basic Retention Function

```sql
-- Weekly retention for January signups
SELECT
    retention_week,
    users,
    round(users / max(users) OVER () * 100, 2) AS retention_pct
FROM (
    SELECT
        retention(
            toDate(event_time) = toDate(first_event),
            toDate(event_time) = toDate(first_event) + 7,
            toDate(event_time) = toDate(first_event) + 14,
            toDate(event_time) = toDate(first_event) + 21,
            toDate(event_time) = toDate(first_event) + 28
        ) AS retention_weeks
    FROM events
    INNER JOIN (
        SELECT
            user_id,
            min(event_time) AS first_event
        FROM events
        WHERE event_type = 'signup'
          AND event_time >= '2024-01-01'
          AND event_time < '2024-02-01'
        GROUP BY user_id
    ) first_events USING (user_id)
    GROUP BY user_id
)
ARRAY JOIN retention_weeks AS active, arrayEnumerate(retention_weeks) AS retention_week
WHERE active = 1
GROUP BY retention_week
ORDER BY retention_week;
```

### Cohort Retention Matrix

```sql
-- Full cohort retention matrix
WITH cohorts AS (
    SELECT
        user_id,
        toStartOfWeek(min(event_time)) AS cohort_week
    FROM events
    WHERE event_type = 'signup'
    GROUP BY user_id
),
activity AS (
    SELECT
        user_id,
        toStartOfWeek(event_time) AS activity_week
    FROM events
    GROUP BY user_id, activity_week
)
SELECT
    cohort_week,
    dateDiff('week', cohort_week, activity_week) AS weeks_since_signup,
    count(DISTINCT user_id) AS active_users,
    round(active_users / max(active_users) OVER (PARTITION BY cohort_week) * 100, 2) AS retention_pct
FROM activity
INNER JOIN cohorts USING (user_id)
WHERE activity_week >= cohort_week
GROUP BY cohort_week, weeks_since_signup
ORDER BY cohort_week, weeks_since_signup;
```

### N-Day Retention

```sql
-- Day 1, 7, 14, 30 retention
WITH user_activity AS (
    SELECT
        user_id,
        min(toDate(event_time)) AS signup_date,
        groupArray(DISTINCT toDate(event_time)) AS active_dates
    FROM events
    WHERE event_time >= '2024-01-01'
    GROUP BY user_id
)
SELECT
    countIf(has(active_dates, signup_date + 1)) AS day_1_retained,
    countIf(has(active_dates, signup_date + 7)) AS day_7_retained,
    countIf(has(active_dates, signup_date + 14)) AS day_14_retained,
    countIf(has(active_dates, signup_date + 30)) AS day_30_retained,
    count() AS total_users,
    round(day_1_retained / total_users * 100, 2) AS day_1_pct,
    round(day_7_retained / total_users * 100, 2) AS day_7_pct,
    round(day_14_retained / total_users * 100, 2) AS day_14_pct,
    round(day_30_retained / total_users * 100, 2) AS day_30_pct
FROM user_activity
WHERE signup_date >= '2024-01-01' AND signup_date <= '2024-01-31';
```

### Rolling Retention

```sql
-- Users who returned within N days (cumulative)
WITH user_activity AS (
    SELECT
        user_id,
        min(toDate(event_time)) AS first_date,
        max(toDate(event_time)) AS last_date
    FROM events
    GROUP BY user_id
)
SELECT
    days_range,
    countIf(last_date >= first_date + days_range) AS retained,
    count() AS total,
    round(retained / total * 100, 2) AS rolling_retention_pct
FROM user_activity
CROSS JOIN (
    SELECT number AS days_range
    FROM numbers(31)
    WHERE number > 0
) ranges
WHERE first_date >= '2024-01-01' AND first_date <= '2024-01-31'
GROUP BY days_range
ORDER BY days_range;
```

## Sequence Analysis

### sequenceMatch Function

```sql
-- Users who viewed product then purchased within 1 hour
SELECT count(DISTINCT user_id) AS users
FROM events
WHERE sequenceMatch('(?1).*(?2)')(
    event_time,
    event_type = 'view_product',
    event_type = 'purchase'
)
AND event_time >= '2024-01-01';

-- Sequence with time constraint
SELECT count(DISTINCT user_id) AS users
FROM events
WHERE sequenceMatch('(?1)(?t<=3600)(?2)')(  -- Within 1 hour
    event_time,
    event_type = 'view_product',
    event_type = 'purchase'
)
AND event_time >= '2024-01-01';
```

### sequenceCount Function

```sql
-- Count how many times users completed a sequence
SELECT
    user_id,
    sequenceCount('(?1).*(?2)')(
        event_time,
        event_type = 'view_product',
        event_type = 'add_to_cart'
    ) AS view_to_cart_count
FROM events
WHERE event_time >= '2024-01-01'
GROUP BY user_id
ORDER BY view_to_cart_count DESC
LIMIT 100;
```

## User Journey Analysis

### Common Paths

```sql
-- Most common event sequences
SELECT
    path,
    count() AS users
FROM (
    SELECT
        user_id,
        arrayStringConcat(
            arraySlice(
                groupArray(event_type),
                1, 5  -- First 5 events
            ),
            ' -> '
        ) AS path
    FROM (
        SELECT user_id, event_type, event_time
        FROM events
        WHERE event_time >= '2024-01-01'
        ORDER BY user_id, event_time
    )
    GROUP BY user_id
)
GROUP BY path
ORDER BY users DESC
LIMIT 20;
```

### Drop-off Analysis

```sql
-- Where do users drop off in the funnel?
WITH funnel_data AS (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'landing_page',
            event_type = 'signup_start',
            event_type = 'signup_complete',
            event_type = 'first_action'
        ) AS max_step
    FROM events
    WHERE event_time >= '2024-01-01'
    GROUP BY user_id
)
SELECT
    max_step AS dropped_at_step,
    CASE max_step
        WHEN 1 THEN 'After landing page'
        WHEN 2 THEN 'During signup'
        WHEN 3 THEN 'After signup, before first action'
        WHEN 4 THEN 'Completed funnel'
    END AS stage,
    count() AS users
FROM funnel_data
GROUP BY max_step
ORDER BY max_step;
```

## Materialized Views for Analytics

### Pre-Computed Funnels

```sql
-- Daily funnel metrics
CREATE MATERIALIZED VIEW funnel_daily_mv
ENGINE = SummingMergeTree()
ORDER BY (day, acquisition_source)
AS SELECT
    toDate(event_time) AS day,
    any(acquisition_source) AS acquisition_source,
    windowFunnel(86400)(
        event_time,
        event_type = 'view',
        event_type = 'cart',
        event_type = 'purchase'
    ) AS max_step
FROM events
GROUP BY user_id, day;

-- Query pre-computed funnels
SELECT
    day,
    acquisition_source,
    countIf(max_step >= 1) AS viewers,
    countIf(max_step >= 2) AS carters,
    countIf(max_step >= 3) AS purchasers
FROM funnel_daily_mv
WHERE day >= '2024-01-01'
GROUP BY day, acquisition_source
ORDER BY day;
```

### Cohort Pre-Aggregation

```sql
-- Pre-compute user cohort assignments
CREATE TABLE user_cohorts
(
    user_id UInt64,
    cohort_week Date,
    acquisition_source LowCardinality(String)
)
ENGINE = ReplacingMergeTree()
ORDER BY user_id;

-- Populate from events
INSERT INTO user_cohorts
SELECT
    user_id,
    toStartOfWeek(min(event_time)) AS cohort_week,
    any(acquisition_source) AS acquisition_source
FROM events
WHERE event_type = 'signup'
GROUP BY user_id;
```

## Performance Tips

### Optimize Funnel Queries

```sql
-- Add index for funnel queries
ALTER TABLE events ADD INDEX idx_event_type event_type TYPE set(100) GRANULARITY 4;

-- Filter early with PREWHERE
SELECT
    step,
    count() AS users
FROM (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view',
            event_type = 'cart',
            event_type = 'purchase'
        ) AS step
    FROM events
    PREWHERE event_time >= '2024-01-01' AND event_time < '2024-02-01'
    WHERE event_type IN ('view', 'cart', 'purchase')
    GROUP BY user_id
)
GROUP BY step;
```

### Use Sampling for Exploration

```sql
-- Sample for quick iteration
SELECT
    step,
    count() * 10 AS estimated_users
FROM (
    SELECT
        user_id,
        windowFunnel(86400)(
            event_time,
            event_type = 'view',
            event_type = 'cart',
            event_type = 'purchase'
        ) AS step
    FROM events SAMPLE 0.1
    WHERE event_time >= '2024-01-01'
    GROUP BY user_id
)
GROUP BY step;
```

---

ClickHouse's windowFunnel and retention functions make funnel and cohort analysis straightforward. Design your events table with appropriate ordering, pre-compute common metrics with materialized views, and use the sequence functions for complex user journey analysis. These techniques enable fast product analytics queries even on billions of events.
