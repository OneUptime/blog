# How to Build Payment Processing Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Payment, Analytics, MergeTree, Aggregation, Finance

Description: Learn how to store, query, and analyze payment transaction data at scale using ClickHouse for real-time processing insights.

---

Payment processing generates millions of events daily - authorizations, settlements, chargebacks, and refunds. ClickHouse is well-suited to handle this volume and deliver sub-second analytics.

## Schema Design

Design a payments table that captures key transaction fields:

```sql
CREATE TABLE payments (
    payment_id     UUID,
    merchant_id    UInt64,
    customer_id    UInt64,
    amount         Decimal64(2),
    currency       LowCardinality(String),
    status         LowCardinality(String),  -- authorized, settled, declined, refunded, chargeback
    payment_method LowCardinality(String),  -- card, wallet, bank_transfer
    gateway        LowCardinality(String),
    country        LowCardinality(String),
    created_at     DateTime,
    settled_at     Nullable(DateTime),
    error_code     Nullable(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (merchant_id, created_at, payment_id);
```

## Authorization Rate Analysis

Track authorization success rates by payment method and gateway:

```sql
SELECT
    gateway,
    payment_method,
    countIf(status = 'authorized') AS authorized,
    count() AS total,
    round(countIf(status = 'authorized') / count() * 100, 2) AS auth_rate_pct
FROM payments
WHERE created_at >= now() - INTERVAL 7 DAY
GROUP BY gateway, payment_method
ORDER BY total DESC;
```

## Transaction Volume by Hour

Identify peak payment periods to plan infrastructure capacity:

```sql
SELECT
    toHour(created_at) AS hour_of_day,
    count() AS txn_count,
    sum(amount) AS total_volume,
    avg(amount) AS avg_ticket
FROM payments
WHERE created_at >= today() - 30
  AND status IN ('authorized', 'settled')
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Chargeback Rate by Merchant

Monitor chargeback rates to flag high-risk merchants:

```sql
SELECT
    merchant_id,
    countIf(status = 'settled') AS settled_txns,
    countIf(status = 'chargeback') AS chargebacks,
    round(countIf(status = 'chargeback') / countIf(status = 'settled') * 100, 3) AS chargeback_rate_pct
FROM payments
WHERE created_at >= today() - 90
GROUP BY merchant_id
HAVING chargeback_rate_pct > 1.0
ORDER BY chargeback_rate_pct DESC
LIMIT 50;
```

## Settlement Lag Analysis

Measure average time from authorization to settlement per gateway:

```sql
SELECT
    gateway,
    avg(dateDiff('minute', created_at, settled_at)) AS avg_settlement_min,
    quantile(0.95)(dateDiff('minute', created_at, settled_at)) AS p95_settlement_min
FROM payments
WHERE status = 'settled'
  AND settled_at IS NOT NULL
  AND created_at >= today() - 30
GROUP BY gateway
ORDER BY avg_settlement_min;
```

## Materialized View for Real-Time Summaries

Pre-aggregate hourly totals with a materialized view to serve dashboards with minimal latency:

```sql
CREATE MATERIALIZED VIEW payments_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (merchant_id, gateway, hour)
AS SELECT
    merchant_id,
    gateway,
    toStartOfHour(created_at) AS hour,
    countIf(status = 'authorized') AS auth_count,
    sumIf(amount, status IN ('authorized', 'settled')) AS volume,
    count() AS total_count
FROM payments
GROUP BY merchant_id, gateway, hour;
```

## Summary

ClickHouse is a strong fit for payment analytics - its columnar storage handles high insert rates from payment gateways, while fast aggregations power real-time dashboards for authorization rates, settlement lag, chargeback detection, and merchant risk scoring. Partitioning by month and ordering by merchant and timestamp ensures efficient queries across large historical datasets.
