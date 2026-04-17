# How to Build Credit Scoring Feature Stores with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Credit Scoring, Feature Store, Machine Learning, Finance, Aggregation

Description: Build a credit scoring feature store in ClickHouse to compute and serve behavioral features like payment history and utilization ratios in real time.

---

A credit scoring feature store needs to compute hundreds of behavioral features per customer on demand - payment history, utilization ratios, delinquency counts, and spending trends. ClickHouse is ideal for this because it can aggregate across large transaction histories in milliseconds.

## Core Transaction Table

```sql
CREATE TABLE credit_events (
    customer_id  UInt64,
    account_id   UInt64,
    event_type   LowCardinality(String), -- payment, missed_payment, new_credit, inquiry
    amount       Decimal64(2),
    balance      Decimal64(2),
    credit_limit Decimal64(2),
    event_date   Date,
    created_at   DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (customer_id, event_date);
```

## Payment History Feature

Count on-time vs. missed payments over the last 12 months:

```sql
SELECT
    customer_id,
    countIf(event_type = 'payment') AS payments_made,
    countIf(event_type = 'missed_payment') AS missed_payments,
    round(countIf(event_type = 'payment') /
        (countIf(event_type = 'payment') + countIf(event_type = 'missed_payment')) * 100, 2)
        AS payment_rate_pct
FROM credit_events
WHERE event_date >= today() - 365
GROUP BY customer_id;
```

## Credit Utilization Ratio

Calculate average utilization as a key scoring feature:

```sql
SELECT
    customer_id,
    avg(balance / nullIf(credit_limit, 0)) AS avg_utilization,
    max(balance / nullIf(credit_limit, 0)) AS max_utilization,
    argMax(balance, event_date) AS latest_balance,
    argMax(credit_limit, event_date) AS latest_limit
FROM credit_events
WHERE event_date >= today() - 180
  AND event_type IN ('payment', 'missed_payment')
GROUP BY customer_id;
```

## Delinquency Streak Detection

Find customers with consecutive missed payments:

```sql
SELECT
    customer_id,
    count() AS consecutive_missed,
    min(event_date) AS streak_start,
    max(event_date) AS streak_end
FROM (
    SELECT
        customer_id,
        event_date,
        event_type,
        row_number() OVER (PARTITION BY customer_id ORDER BY event_date) -
        row_number() OVER (PARTITION BY customer_id, event_type ORDER BY event_date) AS grp
    FROM credit_events
    WHERE event_type = 'missed_payment'
      AND event_date >= today() - 365
)
GROUP BY customer_id, grp
HAVING consecutive_missed >= 3
ORDER BY consecutive_missed DESC;
```

## New Credit Inquiries Feature

Recent hard inquiries are a negative scoring signal:

```sql
SELECT
    customer_id,
    countIf(event_type = 'inquiry' AND event_date >= today() - 90) AS inquiries_90d,
    countIf(event_type = 'new_credit' AND event_date >= today() - 365) AS new_accounts_1y
FROM credit_events
WHERE event_date >= today() - 365
GROUP BY customer_id;
```

## Materialized Feature Table

Persist pre-computed features for low-latency model serving:

```sql
CREATE TABLE credit_features
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY customer_id
AS SELECT
    customer_id,
    now() AS computed_at,
    countIf(event_type = 'payment') AS payments_12m,
    countIf(event_type = 'missed_payment') AS missed_12m,
    avg(balance / nullIf(credit_limit, 0)) AS avg_utilization_6m,
    countIf(event_type = 'inquiry' AND event_date >= today() - 90) AS inquiries_90d
FROM credit_events
WHERE event_date >= today() - 365
GROUP BY customer_id;
```

## Summary

ClickHouse works as a high-performance feature store for credit scoring by aggregating behavioral events per customer across long time windows. Features computed here - payment rates, utilization, delinquency streaks, and inquiry counts - feed directly into ML models or rule-based scoring engines with minimal latency.
