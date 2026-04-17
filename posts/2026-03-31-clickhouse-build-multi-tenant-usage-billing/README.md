# How to Build Multi-Tenant Usage Billing with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Usage Billing, Multi-Tenant, Metering, SaaS

Description: Learn how to meter resource consumption per tenant in ClickHouse and generate accurate usage summaries for billing at scale.

---

Usage-based billing requires accurate, tamper-evident metering of resource consumption per tenant - API calls, compute time, storage, or seats. ClickHouse's append-only MergeTree storage and fast aggregations make it ideal as the metering ledger that feeds your billing engine.

## Metering Event Schema

```sql
CREATE TABLE usage_events
(
    ts           DateTime64(3),
    tenant_id    UInt64,
    resource     LowCardinality(String), -- 'api_call','compute_ms','storage_gb_hr','seat'
    quantity     Decimal(18, 6),         -- Decimal avoids Float/Decimal arithmetic errors with unit_price
    unit_price   Decimal(10, 6),         -- price per unit at time of event
    idempotency_key String               -- prevent double-counting on retry
)
ENGINE = ReplacingMergeTree(ts)
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, resource, idempotency_key);
```

Using `ReplacingMergeTree` on the idempotency key prevents duplicate charges from retry storms.

## Monthly Usage Summary per Tenant

```sql
SELECT
    tenant_id,
    resource,
    sum(quantity)              AS total_quantity,
    sum(quantity * unit_price) AS total_cost
FROM usage_events
WHERE toStartOfMonth(ts) = toStartOfMonth(now())
GROUP BY tenant_id, resource
ORDER BY tenant_id, resource;
```

## Invoice Line Items

```sql
SELECT
    tenant_id,
    resource,
    sum(quantity)              AS qty,
    max(unit_price)            AS unit_price,
    sum(quantity * unit_price) AS line_total
FROM (
    -- deduplicated view after ReplacingMergeTree merge
    SELECT * FROM usage_events FINAL
    WHERE toStartOfMonth(ts) = toStartOfMonth(now())
)
GROUP BY tenant_id, resource;
```

## Daily Usage Trend per Tenant

```sql
SELECT
    tenant_id,
    toDate(ts) AS day,
    resource,
    sum(quantity) AS daily_usage
FROM usage_events
WHERE tenant_id = 42
  AND ts >= now() - INTERVAL 30 DAY
GROUP BY tenant_id, day, resource
ORDER BY day, resource;
```

## Detect Anomalous Usage Spikes

```sql
WITH daily AS (
    SELECT
        tenant_id,
        toDate(ts) AS day,
        sum(quantity) AS daily_qty
    FROM usage_events
    WHERE resource = 'api_call'
    GROUP BY tenant_id, day
)
SELECT
    tenant_id,
    day,
    daily_qty,
    avg(daily_qty) OVER (PARTITION BY tenant_id ORDER BY day ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING) AS rolling_avg,
    daily_qty / (rolling_avg + 1) AS spike_ratio
FROM daily
QUALIFY spike_ratio > 5
ORDER BY spike_ratio DESC;
```

## Revenue by Tier

```sql
SELECT
    t.plan,
    sum(u.quantity * u.unit_price) AS monthly_revenue
FROM usage_events u
JOIN tenants t ON u.tenant_id = t.tenant_id
WHERE toStartOfMonth(u.ts) = toStartOfMonth(now())
GROUP BY t.plan
ORDER BY monthly_revenue DESC;
```

## Summary

ClickHouse provides a reliable, scalable metering ledger for multi-tenant usage billing. Use ReplacingMergeTree with idempotency keys to prevent duplicate charges, aggregate monthly usage into invoice line items, and detect anomalous consumption spikes with rolling window averages. The append-only nature of the table ensures a complete audit trail for billing disputes.
