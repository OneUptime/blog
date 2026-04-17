# How to Track Customer Usage and Billing Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Telecom, Billing, Usage Tracking, Revenue Analytics

Description: Use ClickHouse to store telecom customer usage events and generate billing summaries, overage alerts, and revenue reports at scale.

---

Telecom billing systems must process billions of usage events each month and produce accurate invoices on time. ClickHouse can serve as the analytical layer behind billing pipelines, enabling fast reconciliation, overage detection, and revenue reporting.

## Usage Events Table

```sql
CREATE TABLE usage_events (
    event_id        UUID,
    subscriber_id   UInt64,
    account_id      UInt64,
    plan_id         UInt32,
    occurred_at     DateTime,
    service_type    LowCardinality(String),  -- 'voice', 'sms', 'data', 'roaming'
    units_consumed  UInt64,   -- seconds for voice, count for SMS, bytes for data
    unit_type       LowCardinality(String),
    rated_cost      UInt32,   -- in micros (millionths of a dollar)
    is_in_bundle    UInt8,
    is_roaming      UInt8,
    country_code    FixedString(2)
) ENGINE = MergeTree()
ORDER BY (account_id, subscriber_id, occurred_at)
PARTITION BY toYYYYMM(occurred_at);
```

## Monthly Bill Summary per Account

```sql
SELECT
    account_id,
    toYYYYMM(occurred_at)          AS billing_month,
    service_type,
    sum(units_consumed)            AS total_units,
    sum(rated_cost) / 1e6          AS total_cost_dollars
FROM usage_events
WHERE occurred_at >= toStartOfMonth(today() - INTERVAL 1 MONTH)
  AND occurred_at < toStartOfMonth(today())
GROUP BY account_id, billing_month, service_type
ORDER BY account_id, service_type;
```

## Top 20 Highest-Usage Accounts

```sql
SELECT
    account_id,
    round(sum(rated_cost) / 1e6, 2) AS total_spend
FROM usage_events
WHERE toYYYYMM(occurred_at) = toYYYYMM(today())
GROUP BY account_id
ORDER BY total_spend DESC
LIMIT 20;
```

## Data Overage Detection

Identify subscribers who have exceeded their bundled data allowance.

```sql
SELECT
    subscriber_id,
    sum(units_consumed) / 1e9              AS total_gb,
    sumIf(units_consumed, is_in_bundle = 0) / 1e9 AS overage_gb,
    sum(rated_cost) / 1e6                  AS total_cost
FROM usage_events
WHERE service_type = 'data'
  AND toYYYYMM(occurred_at) = toYYYYMM(today())
GROUP BY subscriber_id
HAVING overage_gb > 0
ORDER BY overage_gb DESC
LIMIT 50;
```

## Roaming Revenue by Country

```sql
SELECT
    country_code,
    count()                       AS events,
    sum(rated_cost) / 1e6         AS roaming_revenue
FROM usage_events
WHERE is_roaming = 1
  AND occurred_at >= today() - 30
GROUP BY country_code
ORDER BY roaming_revenue DESC
LIMIT 20;
```

## Daily Revenue Run Rate

```sql
SELECT
    toDate(occurred_at)       AS day,
    round(sum(rated_cost) / 1e6, 2) AS daily_revenue
FROM usage_events
WHERE occurred_at >= today() - 30
GROUP BY day
ORDER BY day;
```

## Materialized View for Real-Time Billing

```sql
CREATE MATERIALIZED VIEW billing_daily_mv
ENGINE = SummingMergeTree()
ORDER BY (account_id, service_type, day)
AS
SELECT
    account_id,
    service_type,
    toDate(occurred_at) AS day,
    sum(units_consumed) AS units,
    sum(rated_cost)     AS cost_microcents
FROM usage_events
GROUP BY account_id, service_type, day;
```

## Summary

ClickHouse provides telecom billing teams with a fast analytical layer on top of their usage event streams. By partitioning by billing month, using `SummingMergeTree` materialized views, and leveraging conditional aggregation, you can generate invoice summaries, detect overages, and track revenue in near real time without slowing down the OLTP billing system.
