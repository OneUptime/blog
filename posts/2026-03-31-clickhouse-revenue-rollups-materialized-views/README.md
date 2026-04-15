# How to Build Revenue Roll-Ups with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Revenue Analytics, SummingMergeTree, Financial Reporting

Description: Build daily, weekly, and monthly revenue roll-ups in ClickHouse using materialized views to power fast financial dashboards without repeated full-table scans.

---

## Revenue Reporting Needs Pre-Aggregation

Finance and business teams run revenue queries constantly - today's GMV, this week's growth, monthly recurring revenue trends. Each full scan of an orders table with billions of rows wastes compute. Materialized views pre-aggregate revenue at multiple granularities so these reports return instantly.

## Orders Base Table

```sql
CREATE TABLE orders
(
    order_time DateTime,
    order_id UInt64,
    customer_id UInt64,
    product_id UInt64,
    category LowCardinality(String),
    region LowCardinality(String),
    country LowCardinality(String),
    channel LowCardinality(String),
    gross_amount Decimal(12, 2),
    discount_amount Decimal(10, 2),
    net_amount Decimal(12, 2),
    currency LowCardinality(String),
    status LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(order_time)
ORDER BY (region, channel, order_time);
```

## Daily Revenue Roll-Up

```sql
CREATE TABLE revenue_daily
(
    revenue_date Date,
    region LowCardinality(String),
    country LowCardinality(String),
    channel LowCardinality(String),
    category LowCardinality(String),
    order_count UInt64,
    gross_revenue Decimal(14, 2),
    discount_total Decimal(12, 2),
    net_revenue Decimal(14, 2)
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(revenue_date)
ORDER BY (revenue_date, region, country, channel, category);

CREATE MATERIALIZED VIEW revenue_daily_mv
TO revenue_daily
AS
SELECT
    toDate(order_time) AS revenue_date,
    region,
    country,
    channel,
    category,
    countIf(status = 'completed') AS order_count,
    sumIf(gross_amount, status = 'completed') AS gross_revenue,
    sumIf(discount_amount, status = 'completed') AS discount_total,
    sumIf(net_amount, status = 'completed') AS net_revenue
FROM orders
GROUP BY revenue_date, region, country, channel, category;
```

## Month-to-Date Revenue Dashboard

```sql
SELECT
    region,
    channel,
    sum(order_count) AS mtd_orders,
    sum(gross_revenue) AS mtd_gross,
    sum(net_revenue) AS mtd_net,
    round(sum(discount_total) / nullIf(sum(gross_revenue), 0) * 100, 1) AS discount_rate_pct
FROM revenue_daily
WHERE revenue_date >= toStartOfMonth(today())
GROUP BY region, channel
ORDER BY mtd_net DESC;
```

## Week-Over-Week Growth

```sql
WITH this_week AS (
    SELECT region, sum(net_revenue) AS revenue
    FROM revenue_daily
    WHERE revenue_date >= today() - 7
    GROUP BY region
),
last_week AS (
    SELECT region, sum(net_revenue) AS revenue
    FROM revenue_daily
    WHERE revenue_date BETWEEN today() - 14 AND today() - 8
    GROUP BY region
)
SELECT
    t.region,
    t.revenue AS this_week_revenue,
    l.revenue AS last_week_revenue,
    round((t.revenue - l.revenue) / nullIf(l.revenue, 0) * 100, 1) AS wow_growth_pct
FROM this_week AS t
LEFT JOIN last_week AS l ON t.region = l.region
ORDER BY wow_growth_pct DESC;
```

## Monthly Recurring Revenue Trend

```sql
SELECT
    toStartOfMonth(revenue_date) AS month,
    sum(net_revenue) AS monthly_revenue,
    sum(order_count) AS monthly_orders,
    round(sum(net_revenue) / nullIf(sum(order_count), 0), 2) AS avg_order_value
FROM revenue_daily
WHERE revenue_date >= today() - 365
GROUP BY month
ORDER BY month;
```

## Summary

Revenue roll-ups in ClickHouse use SummingMergeTree target tables populated by materialized views that aggregate orders at insert time. Daily pre-aggregation with dimension breakdowns (region, channel, category) supports instant MTD, WoW, and MRR queries without full scans. The pattern scales to billions of orders while keeping financial dashboards sub-second.
