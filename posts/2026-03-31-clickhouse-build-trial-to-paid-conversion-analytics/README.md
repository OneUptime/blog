# How to Build Trial-to-Paid Conversion Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Trial Conversion, SaaS, Funnel Analysis, Revenue Analytics

Description: Learn how to track trial user behavior in ClickHouse and identify the usage patterns most predictive of converting to a paid plan.

---

Trial-to-paid conversion is the most critical metric for SaaS growth. Understanding which trial behaviors predict conversion lets you optimize onboarding, improve in-product triggers, and focus sales outreach on the highest-probability accounts. ClickHouse lets you run these analyses across millions of trial events in seconds.

## Schema

```sql
CREATE TABLE trial_events
(
    ts           DateTime,
    user_id      UInt64,
    account_id   UInt64,
    event_type   LowCardinality(String),
    feature      LowCardinality(String),
    trial_day    UInt8,  -- day 1-30 of trial
    converted    UInt8   -- 1 if account eventually converted
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (account_id, ts);
```

## Overall Conversion Rate

```sql
SELECT
    uniqExact(account_id)                           AS total_trials,
    uniqExactIf(account_id, converted = 1)          AS converted_accounts,
    converted_accounts * 100.0 / total_trials       AS conversion_rate_pct
FROM trial_events
WHERE ts >= now() - INTERVAL 90 DAY;
```

## Conversion Rate by Trial Day of Key Action

At which trial day do converters typically use a key feature?

```sql
SELECT
    trial_day,
    countIf(converted = 1) AS converters,
    countIf(converted = 0) AS non_converters
FROM trial_events
WHERE event_type = 'first_key_action'
GROUP BY trial_day
ORDER BY trial_day;
```

## Feature Usage Correlation with Conversion

Which features are most predictive of conversion?

```sql
SELECT
    feature,
    countIf(converted = 1) * 100.0 / count() AS converter_pct
FROM trial_events
WHERE event_type = 'use'
GROUP BY feature
ORDER BY converter_pct DESC
LIMIT 20;
```

## Average Usage Metrics - Converters vs Non-Converters

```sql
SELECT
    converted,
    avg(total_events) AS avg_events,
    avg(active_days)  AS avg_active_days,
    avg(features_used) AS avg_features
FROM (
    SELECT
        account_id,
        max(converted)         AS converted,
        count()                AS total_events,
        uniqExact(toDate(ts))  AS active_days,
        uniqExact(feature)     AS features_used
    FROM trial_events
    GROUP BY account_id
)
GROUP BY converted;
```

## Time to Convert from Trial Start

```sql
WITH conversion_times AS (
    SELECT
        account_id,
        min(ts) AS trial_start,
        minIf(ts, converted = 1) AS converted_at
    FROM trial_events
    GROUP BY account_id
    HAVING max(converted) = 1
)
SELECT
    quantile(0.5)(dateDiff('day', trial_start, converted_at))  AS median_days,
    quantile(0.9)(dateDiff('day', trial_start, converted_at))  AS p90_days
FROM conversion_times;
```

## Weekly Conversion Trend

```sql
SELECT
    toStartOfWeek(ts) AS week,
    uniqExactIf(account_id, converted = 1) AS converted_accounts,
    uniqExact(account_id)                  AS all_trial_accounts
FROM trial_events
WHERE event_type = 'trial_start'
GROUP BY week
ORDER BY week;
```

## Summary

ClickHouse enables fast trial-to-paid conversion analysis by combining event-level trial data with conversion outcomes. Identify which features and trial days predict conversion, compare usage metrics between converters and non-converters, and track weekly conversion trends. These insights let product and growth teams design trials that maximize activation and conversion.
