# How to Build Funnel Metrics with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Funnel Analysis, Conversion Rate, Analytics

Description: Build conversion funnel metrics with ClickHouse materialized views that track user progression through funnel stages without expensive full-table scans.

---

## Funnel Analytics at Scale

Conversion funnel analysis - signup to activation, free to paid, add-to-cart to checkout - requires scanning all user events and ordering them by time to determine stage progression. At scale, this is expensive. Materialized views can pre-aggregate funnel stage transitions so conversion rates are always up-to-date.

## User Events Table

```sql
CREATE TABLE user_events
(
    event_time DateTime,
    user_id UInt64,
    event_name LowCardinality(String),
    product LowCardinality(String),
    channel LowCardinality(String),
    experiment_variant LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

## Funnel with windowFunnel Function

ClickHouse's `windowFunnel` function is ideal for funnel analysis:

```sql
-- Signup to purchase funnel, 7-day window
SELECT
    level,
    count() AS users
FROM (
    SELECT
        user_id,
        windowFunnel(604800)(  -- 7 days in seconds
            event_time,
            event_name = 'signup',
            event_name = 'email_verified',
            event_name = 'first_product_view',
            event_name = 'add_to_cart',
            event_name = 'purchase_complete'
        ) AS level
    FROM user_events
    WHERE event_time >= today() - 30
    GROUP BY user_id
)
GROUP BY level
ORDER BY level;
```

## Pre-Aggregated Funnel Materialized View

For dashboards that update frequently, pre-aggregate daily funnel progress:

```sql
CREATE TABLE daily_funnel_progress
(
    cohort_date Date,
    channel LowCardinality(String),
    reached_signup UInt64,
    reached_verification UInt64,
    reached_first_view UInt64,
    reached_cart UInt64,
    reached_purchase UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(cohort_date)
ORDER BY (cohort_date, channel);

CREATE MATERIALIZED VIEW daily_funnel_mv
TO daily_funnel_progress
AS
SELECT
    toDate(min(event_time)) AS cohort_date,
    any(channel) AS channel,
    max(event_name = 'signup') AS reached_signup,
    max(event_name = 'email_verified') AS reached_verification,
    max(event_name = 'first_product_view') AS reached_first_view,
    max(event_name = 'add_to_cart') AS reached_cart,
    max(event_name = 'purchase_complete') AS reached_purchase
FROM user_events
WHERE event_time >= today() - 1
GROUP BY user_id;
```

## Funnel Conversion Rate Dashboard

```sql
SELECT
    channel,
    sum(reached_signup) AS step1_signup,
    sum(reached_verification) AS step2_verify,
    sum(reached_first_view) AS step3_view,
    sum(reached_cart) AS step4_cart,
    sum(reached_purchase) AS step5_purchase,
    round(sum(reached_purchase) / nullIf(sum(reached_signup), 0) * 100, 2) AS overall_conversion_pct,
    round(sum(reached_cart) / nullIf(sum(reached_first_view), 0) * 100, 2) AS view_to_cart_pct
FROM daily_funnel_progress
WHERE cohort_date >= today() - 30
GROUP BY channel
ORDER BY overall_conversion_pct DESC;
```

## Experiment Funnel Comparison

```sql
-- A/B test impact on funnel
SELECT
    experiment_variant,
    count(DISTINCT user_id) AS users,
    countIf(event_name = 'purchase_complete') / count(DISTINCT user_id) * 100 AS purchase_rate
FROM user_events
WHERE event_time >= today() - 14
  AND experiment_variant IN ('control', 'treatment')
GROUP BY experiment_variant;
```

## Summary

Funnel metrics in ClickHouse are best computed using the `windowFunnel` function for ad-hoc analysis, and pre-aggregated daily cohort tables for fast dashboard queries. Materialized views populate daily funnel progress tables on insert, keeping conversion rate dashboards current without repeated full scans. Add channel and experiment variant dimensions to support segmented funnel analysis.
