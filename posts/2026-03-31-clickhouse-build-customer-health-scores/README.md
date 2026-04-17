# How to Build Customer Health Scores with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Customer Health Score, SaaS, Retention, Product Analytics

Description: Learn how to compute composite customer health scores in ClickHouse by combining usage frequency, feature breadth, and support signals.

---

Customer health scores give customer success teams an early warning system before churn happens. By combining signals like login frequency, feature usage breadth, and support ticket volume into a single score, teams can prioritize outreach. ClickHouse makes it easy to compute these scores daily across all accounts.

## Signal Tables

Assume three sources of signals feeding into ClickHouse:

```sql
CREATE TABLE account_daily_signals
(
    day            Date,
    account_id     UInt64,
    logins         UInt32,
    features_used  UInt16,
    api_calls      UInt64,
    errors         UInt32,
    support_tickets UInt16,
    plan           LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (account_id, day);
```

## 30-Day Rolling Signal Aggregation

```sql
SELECT
    account_id,
    sum(logins)          AS total_logins_30d,
    avg(features_used)   AS avg_features_per_day,
    sum(api_calls)       AS total_api_calls_30d,
    sum(errors)          AS total_errors_30d,
    sum(support_tickets) AS total_tickets_30d
FROM account_daily_signals
WHERE day >= today() - 30
GROUP BY account_id;
```

## Health Score Computation

Combine normalized signals into a 0-100 score:

```sql
WITH signals AS (
    SELECT
        account_id,
        sum(logins)          AS logins_30d,
        avg(features_used)   AS avg_features,
        sum(api_calls)       AS api_calls_30d,
        sum(support_tickets) AS tickets_30d
    FROM account_daily_signals
    WHERE day >= today() - 30
    GROUP BY account_id
)
SELECT
    account_id,
    round(
        least(logins_30d / 60.0, 1.0)     * 30 +  -- login score (weight 30)
        least(avg_features / 10.0, 1.0)   * 30 +  -- breadth score (weight 30)
        least(api_calls_30d / 10000.0, 1.0) * 25 + -- usage depth (weight 25)
        greatest(1.0 - tickets_30d / 5.0, 0.0) * 15 -- support penalty (weight 15)
    ) AS health_score
FROM signals
ORDER BY health_score ASC;
```

## Categorize Accounts into Health Bands

```sql
SELECT
    account_id,
    health_score,
    multiIf(
        health_score >= 75, 'healthy',
        health_score >= 50, 'at_risk',
        'critical'
    ) AS health_band
FROM (
    -- inline the health score CTE above
    ...
)
ORDER BY health_score;
```

## Trend: Health Score Change Week-over-Week

```sql
WITH weekly AS (
    SELECT
        account_id,
        toStartOfWeek(day) AS week,
        sum(logins)        AS logins
    FROM account_daily_signals
    GROUP BY account_id, week
)
SELECT
    account_id,
    week,
    logins,
    logins - lagInFrame(logins) OVER (PARTITION BY account_id ORDER BY week) AS wow_change
FROM weekly
ORDER BY account_id, week;
```

## Accounts Declining Fastest

```sql
SELECT
    account_id,
    argMax(health_score, computed_at) AS latest_score,
    argMax(prev_score, computed_at)   AS prev_score,
    argMax(health_score, computed_at) - argMax(prev_score, computed_at) AS delta
FROM (
    SELECT
        account_id,
        health_score,
        lagInFrame(health_score) OVER (PARTITION BY account_id ORDER BY computed_at) AS prev_score,
        computed_at
    FROM health_scores_history
)
GROUP BY account_id
ORDER BY delta ASC
LIMIT 20;
```

## Summary

ClickHouse enables fast, flexible health score computation by aggregating multi-signal data over rolling windows. Combine login frequency, feature breadth, API usage, and support load into a weighted score, then segment accounts into health bands. Run daily via a scheduled job or materialized view to keep customer success teams informed without heavy infrastructure.
