# How to Analyze Roaming Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Telecom, Roaming, Revenue Analytics, International

Description: Analyze international roaming usage and revenue in ClickHouse to optimize partner agreements, detect roaming fraud, and report settlement data.

---

Roaming generates significant revenue for telecom operators while also carrying the highest fraud risk. Analyzing roaming data helps operators validate partner settlement records, detect SIM-based fraud, and understand customer roaming habits.

## Roaming Events Table

```sql
CREATE TABLE roaming_events (
    event_id            UUID,
    subscriber_id       UInt64,
    home_operator       LowCardinality(String),
    visited_operator    LowCardinality(String),
    visited_country     FixedString(2),
    occurred_at         DateTime,
    service_type        LowCardinality(String),   -- 'voice', 'sms', 'data'
    units_consumed      UInt64,
    wholesale_rate      UInt32,   -- microcents per unit
    retail_rate         UInt32,
    wholesale_cost      UInt32,
    retail_revenue      UInt32,
    is_fraud_flagged    UInt8
) ENGINE = MergeTree()
ORDER BY (home_operator, subscriber_id, occurred_at)
PARTITION BY toYYYYMM(occurred_at);
```

## Roaming Revenue vs Cost by Country

```sql
SELECT
    visited_country,
    service_type,
    sum(retail_revenue) / 1e6   AS retail_revenue_usd,
    sum(wholesale_cost) / 1e6   AS wholesale_cost_usd,
    round((sum(retail_revenue) - sum(wholesale_cost)) / 1e6, 2) AS margin_usd
FROM roaming_events
WHERE occurred_at >= toStartOfMonth(today())
GROUP BY visited_country, service_type
ORDER BY margin_usd DESC
LIMIT 20;
```

## Top Roaming Subscribers

```sql
SELECT
    subscriber_id,
    count(DISTINCT visited_country)     AS countries_visited,
    sum(retail_revenue) / 1e6           AS total_spend_usd
FROM roaming_events
WHERE occurred_at >= today() - 30
GROUP BY subscriber_id
ORDER BY total_spend_usd DESC
LIMIT 20;
```

## Roaming Data Usage by Visited Network

```sql
SELECT
    visited_operator,
    visited_country,
    sum(units_consumed) / 1e9   AS total_gb,
    count()                     AS sessions
FROM roaming_events
WHERE service_type = 'data'
  AND occurred_at >= today() - 30
GROUP BY visited_operator, visited_country
ORDER BY total_gb DESC
LIMIT 20;
```

## Fraud Detection - High-Volume Roaming in Short Time

```sql
SELECT
    subscriber_id,
    visited_country,
    count()                 AS events_in_window,
    sum(units_consumed)     AS total_units,
    min(occurred_at)        AS first_event,
    max(occurred_at)        AS last_event
FROM roaming_events
WHERE occurred_at >= now() - INTERVAL 1 HOUR
  AND service_type = 'data'
GROUP BY subscriber_id, visited_country
HAVING total_units / 1e9 > 10   -- more than 10 GB in 1 hour
ORDER BY total_units DESC
LIMIT 20;
```

## Settlement Reconciliation

Compare your records against partner-submitted data.

```sql
SELECT
    visited_operator,
    toYYYYMM(occurred_at)       AS billing_month,
    count()                     AS our_event_count,
    sum(units_consumed)         AS our_total_units,
    sum(wholesale_cost) / 1e6   AS our_cost_usd
FROM roaming_events
WHERE toYYYYMM(occurred_at) = toYYYYMM(today() - INTERVAL 1 MONTH)
GROUP BY visited_operator, billing_month
ORDER BY visited_operator;
```

Compare this output against the partner invoice to identify discrepancies before settlement.

## Monthly Roaming Trend

```sql
SELECT
    toYYYYMM(occurred_at)           AS month,
    uniqExact(subscriber_id)        AS unique_roamers,
    sum(retail_revenue) / 1e6       AS revenue_usd
FROM roaming_events
WHERE occurred_at >= today() - 180
GROUP BY month
ORDER BY month;
```

## Summary

ClickHouse provides telecom operators with a fast analytical engine for roaming data - from real-time fraud detection and settlement reconciliation to multi-month revenue trending. Partitioning by billing month, using `LowCardinality` for operator and service type columns, and `FixedString` for country codes makes these queries fast even over hundreds of millions of records.
