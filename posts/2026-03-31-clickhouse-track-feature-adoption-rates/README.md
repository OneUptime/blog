# How to Track Feature Adoption Rates in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Feature Adoption, Product Analytics, Cohort, Time To Adopt

Description: Learn how to measure feature adoption rates, time-to-first-use, and adoption curves in ClickHouse to guide product decisions.

---

Feature adoption tracking answers "what percentage of eligible users have tried a new feature?" and "how quickly do users discover it after signup?". ClickHouse's aggregate functions and cohort query patterns make adoption analysis straightforward even across large user bases.

## Schema

Reuse or extend a product events table that records each feature interaction:

```sql
CREATE TABLE feature_events
(
    ts         DateTime,
    user_id    UInt64,
    feature    LowCardinality(String),
    action     LowCardinality(String), -- 'first_use','repeated_use','abandoned'
    plan       LowCardinality(String),
    signup_date Date
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (feature, user_id, ts);
```

## Overall Adoption Rate per Feature

```sql
SELECT
    feature,
    uniqExact(user_id) AS adopted_users
FROM feature_events
WHERE action = 'first_use'
  AND ts >= '2026-01-01'
GROUP BY feature
ORDER BY adopted_users DESC;
```

Cross-reference with total eligible users:

```sql
WITH total AS (SELECT uniqExact(user_id) AS n FROM feature_events)
SELECT
    feature,
    uniqExact(user_id) AS adopted,
    (SELECT n FROM total) AS total_users,
    adopted * 100.0 / (SELECT n FROM total) AS adoption_pct
FROM feature_events
WHERE action = 'first_use'
GROUP BY feature
ORDER BY adoption_pct DESC;
```

## Adoption Curve: Days Since Feature Launch

```sql
WITH launch AS (
    SELECT feature, min(ts) AS launched_at
    FROM feature_events
    WHERE action = 'first_use'
    GROUP BY feature
)
SELECT
    fe.feature,
    dateDiff('day', l.launched_at, fe.ts) AS days_after_launch,
    uniqExact(fe.user_id) AS new_adopters
FROM feature_events fe
JOIN launch l ON fe.feature = l.feature
WHERE fe.action = 'first_use'
GROUP BY fe.feature, days_after_launch
ORDER BY fe.feature, days_after_launch;
```

## Time to First Use After Signup

```sql
SELECT
    feature,
    quantile(0.5)(dateDiff('day', signup_date, toDate(ts))) AS median_days_to_adopt,
    quantile(0.9)(dateDiff('day', signup_date, toDate(ts))) AS p90_days_to_adopt
FROM feature_events
WHERE action = 'first_use'
GROUP BY feature
ORDER BY median_days_to_adopt;
```

## Adoption by Plan Tier

```sql
SELECT
    plan,
    feature,
    uniqExact(user_id) AS adopted_users
FROM feature_events
WHERE action = 'first_use'
  AND ts >= now() - INTERVAL 90 DAY
GROUP BY plan, feature
ORDER BY plan, adopted_users DESC;
```

## Week-over-Week Adoption Growth

```sql
SELECT
    feature,
    toStartOfWeek(ts) AS week,
    uniqExact(user_id) AS weekly_adopters
FROM feature_events
WHERE action = 'first_use'
  AND ts >= now() - INTERVAL 12 WEEK
GROUP BY feature, week
ORDER BY feature, week;
```

## Summary

ClickHouse enables detailed feature adoption analysis with simple SQL patterns. Measure overall adoption rates, plot adoption curves since launch, and segment by plan tier or signup cohort. Use `quantile` to compute median time-to-first-use and identify features that users discover quickly versus those that need better discoverability.
