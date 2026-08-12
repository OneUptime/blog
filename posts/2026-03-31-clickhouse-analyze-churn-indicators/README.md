# How to Analyze Churn Indicators with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Churn Analysis, SaaS, Retention, Leading Indicators

Description: Learn how to identify early churn signals in ClickHouse by analyzing login gaps, feature abandonment, and usage decline patterns.

---

Churn rarely happens without warning. Usage drops off, logins become infrequent, support tickets increase. ClickHouse lets you surface these leading indicators across your entire customer base daily, so customer success teams can act before renewal conversations become cancellation conversations.

## Signal Table

```sql
CREATE TABLE account_activity
(
    day        Date,
    account_id UInt64,
    plan       LowCardinality(String),
    logins     UInt32,
    api_calls  UInt64,
    features_used UInt16
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (account_id, day);
```

## Days Since Last Login

Find accounts that have gone quiet:

```sql
SELECT
    account_id,
    max(day) AS last_active,
    today() - max(day) AS days_inactive
FROM account_activity
WHERE logins > 0
GROUP BY account_id
HAVING days_inactive >= 14
ORDER BY days_inactive DESC;
```

## Usage Decline: Last 7 Days vs Previous 7 Days

```sql
SELECT
    account_id,
    sumIf(api_calls, day >= today() - 7)      AS current_week,
    sumIf(api_calls, day BETWEEN today() - 14 AND today() - 8) AS prev_week,
    (current_week - prev_week) * 100.0 / (prev_week + 1) AS pct_change
FROM account_activity
GROUP BY account_id
HAVING pct_change < -50
ORDER BY pct_change ASC
LIMIT 50;
```

## Feature Abandonment

Detect accounts that stopped using key features:

```sql
SELECT
    account_id,
    countIf(day >= today() - 30 AND features_used > 0) AS active_days_recent,
    countIf(day BETWEEN today() - 60 AND today() - 31 AND features_used > 0) AS active_days_prior
FROM account_activity
GROUP BY account_id
HAVING active_days_prior > 15 AND active_days_recent < 5;
```

## Login Frequency Trend

```sql
SELECT
    account_id,
    toStartOfWeek(day) AS week,
    sum(logins)        AS weekly_logins
FROM account_activity
WHERE day >= today() - 90
GROUP BY account_id, week
ORDER BY account_id, week;
```

## Composite Churn Risk Score

```sql
SELECT
    account_id,
    today() - max(day) AS days_since_login,
    (sumIf(api_calls, day >= today() - 7) + 1) /
        (sumIf(api_calls, day BETWEEN today() - 14 AND today() - 8) + 1) AS usage_ratio,
    -- score: higher = more at risk
    (today() - max(day)) * 2 + round((1.0 - least(usage_ratio, 1.0)) * 50) AS churn_risk_score
FROM account_activity
GROUP BY account_id
ORDER BY churn_risk_score DESC
LIMIT 100;
```

## Accounts That Churned - Post-Hoc Pattern

Analyze the 30-day window before known churn to validate signals:

```sql
SELECT
    dateDiff('day', a.day, c.churned_at) AS days_before_churn,
    avg(a.logins) AS avg_logins,
    avg(a.api_calls) AS avg_api_calls
FROM account_activity a
JOIN churned_accounts c ON a.account_id = c.account_id
WHERE a.day BETWEEN c.churned_at - INTERVAL 30 DAY AND c.churned_at
GROUP BY days_before_churn
ORDER BY days_before_churn;
```

## Summary

ClickHouse makes churn indicator analysis practical at scale. Query days-since-login, usage decline ratios, and feature abandonment patterns across thousands of accounts using standard SQL aggregations. Combine these signals into a composite risk score and run it daily to give customer success teams a prioritized list of accounts that need attention.
