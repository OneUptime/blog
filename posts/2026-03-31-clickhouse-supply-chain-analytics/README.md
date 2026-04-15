# How to Build a Supply Chain Analytics System with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Analytics, Supply Chain, Logistics, Inventory

Description: Design a ClickHouse data model for supply chain analytics covering inventory levels, shipment tracking, supplier performance, and demand forecasting queries.

## Introduction

Modern supply chains generate enormous volumes of data: purchase orders, shipment events, warehouse scans, inventory adjustments, supplier invoices, and delivery confirmations. Analysts need to correlate all of these to answer questions about lead times, stockout risk, supplier reliability, and cost efficiency.

Traditional relational databases struggle when you need to run ad hoc aggregations across years of transactional history. ClickHouse handles these workloads well because it can scan hundreds of millions of rows and return aggregated results in seconds, making it suitable for the exploratory analysis and recurring reports that supply chain teams depend on.

## Schema Design

### Inventory Snapshots

```sql
CREATE TABLE inventory_snapshots
(
    snapshot_at     DateTime,
    warehouse_id    LowCardinality(String),
    sku             String,
    product_name    LowCardinality(String),
    category        LowCardinality(String),
    quantity_on_hand Int32,
    quantity_reserved Int32,
    quantity_in_transit Int32,
    reorder_point   Int32,
    unit_cost_usd   Decimal(12, 4)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_at)
ORDER BY (warehouse_id, sku, snapshot_at);
```

### Shipment Events

```sql
CREATE TABLE shipment_events
(
    event_id        UUID DEFAULT generateUUIDv4(),
    shipment_id     String,
    occurred_at     DateTime64(3),
    event_type      LowCardinality(String),  -- created, picked_up, in_transit, arrived, delivered, exception
    origin_id       LowCardinality(String),
    destination_id  LowCardinality(String),
    carrier         LowCardinality(String),
    tracking_number String,
    sku             String,
    quantity        UInt32,
    weight_kg       Float32,
    estimated_at    DateTime,
    exception_code  LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (carrier, shipment_id, occurred_at);
```

### Purchase Orders

```sql
CREATE TABLE purchase_orders
(
    po_id           String,
    supplier_id     LowCardinality(String),
    supplier_name   LowCardinality(String),
    created_at      DateTime,
    confirmed_at    Nullable(DateTime),
    expected_at     DateTime,
    received_at     Nullable(DateTime),
    sku             String,
    quantity_ordered UInt32,
    quantity_received UInt32,
    unit_cost_usd   Decimal(12, 4),
    warehouse_id    LowCardinality(String),
    status          LowCardinality(String)  -- draft, confirmed, shipped, received, cancelled
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (supplier_id, sku, created_at);
```

### Demand Events

```sql
CREATE TABLE demand_events
(
    event_id        UUID DEFAULT generateUUIDv4(),
    occurred_at     DateTime,
    warehouse_id    LowCardinality(String),
    sku             String,
    channel         LowCardinality(String),  -- ecommerce, retail, wholesale
    quantity        UInt32,
    unit_price_usd  Decimal(12, 4),
    order_id        String,
    customer_region LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (warehouse_id, sku, occurred_at);
```

## Querying Inventory Health

### Current Stock vs Reorder Point

```sql
SELECT
    warehouse_id,
    sku,
    product_name,
    quantity_on_hand,
    quantity_reserved,
    quantity_in_transit,
    quantity_on_hand - quantity_reserved          AS available,
    reorder_point,
    multiIf(
        quantity_on_hand - quantity_reserved <= 0,              'Stockout',
        quantity_on_hand - quantity_reserved < reorder_point,   'Reorder Now',
        quantity_on_hand - quantity_reserved < reorder_point * 2, 'Low Stock',
        'OK'
    ) AS stock_status
FROM inventory_snapshots
WHERE snapshot_at = (SELECT max(snapshot_at) FROM inventory_snapshots)
ORDER BY stock_status, warehouse_id, sku;
```

### Inventory Turnover Rate

```sql
WITH cogs AS (
    SELECT
        warehouse_id,
        sku,
        sum(quantity * unit_cost_usd) AS cost_of_goods_sold
    FROM demand_events
    JOIN (
        SELECT sku, any(unit_cost_usd) AS unit_cost_usd
        FROM inventory_snapshots
        GROUP BY sku
    ) USING sku
    WHERE occurred_at >= now() - INTERVAL 365 DAY
    GROUP BY warehouse_id, sku
),
avg_inv AS (
    SELECT
        warehouse_id,
        sku,
        avg(quantity_on_hand * unit_cost_usd) AS avg_inventory_value
    FROM inventory_snapshots
    WHERE snapshot_at >= now() - INTERVAL 365 DAY
    GROUP BY warehouse_id, sku
)
SELECT
    c.warehouse_id,
    c.sku,
    c.cost_of_goods_sold,
    a.avg_inventory_value,
    c.cost_of_goods_sold / nullIf(a.avg_inventory_value, 0) AS turnover_ratio
FROM cogs AS c
JOIN avg_inv AS a ON c.warehouse_id = a.warehouse_id AND c.sku = a.sku
ORDER BY turnover_ratio DESC
LIMIT 50;
```

## Supplier Performance

### On-Time Delivery Rate

```sql
SELECT
    supplier_id,
    supplier_name,
    count()                                                     AS total_orders,
    countIf(received_at <= expected_at)                         AS on_time,
    countIf(received_at > expected_at)                          AS late,
    countIf(status = 'cancelled')                               AS cancelled,
    round(countIf(received_at <= expected_at) / countIf(status = 'received') * 100, 2) AS otd_pct,
    avg(dateDiff('day', created_at, received_at))               AS avg_lead_days
FROM purchase_orders
WHERE created_at >= now() - INTERVAL 180 DAY
  AND status IN ('received', 'cancelled')
GROUP BY supplier_id, supplier_name
ORDER BY otd_pct ASC;
```

### Fill Rate (Quantity Received vs Ordered)

```sql
SELECT
    supplier_id,
    supplier_name,
    sum(quantity_ordered)   AS total_ordered,
    sum(quantity_received)  AS total_received,
    round(sum(quantity_received) / sum(quantity_ordered) * 100, 2) AS fill_rate_pct
FROM purchase_orders
WHERE received_at >= now() - INTERVAL 90 DAY
GROUP BY supplier_id, supplier_name
ORDER BY fill_rate_pct;
```

## Shipment Transit Time Analysis

```sql
WITH shipment_times AS (
    SELECT
        carrier,
        origin_id,
        destination_id,
        shipment_id,
        minIf(occurred_at, event_type = 'picked_up')  AS picked_up_at,
        minIf(occurred_at, event_type = 'delivered')   AS delivered_at,
        countIf(event_type = 'exception')              AS exceptions,
        countIf(event_type = 'created')                AS created_count
    FROM shipment_events
    WHERE occurred_at >= now() - INTERVAL 90 DAY
    GROUP BY carrier, origin_id, destination_id, shipment_id
)
SELECT
    carrier,
    origin_id,
    destination_id,
    count()                                                           AS shipments,
    avg(dateDiff('hour', picked_up_at, delivered_at))                 AS avg_transit_hours,
    quantile(0.95)(dateDiff('hour', picked_up_at, delivered_at))      AS p95_transit_hours,
    sum(exceptions) / sum(created_count) * 100                        AS exception_rate_pct
FROM shipment_times
GROUP BY carrier, origin_id, destination_id
ORDER BY avg_transit_hours DESC
LIMIT 30;
```

## Demand Forecast vs Actual by Week

```sql
SELECT
    warehouse_id,
    sku,
    toStartOfWeek(occurred_at) AS week,
    sum(quantity)              AS units_sold,
    sum(quantity * unit_price_usd) AS revenue_usd
FROM demand_events
WHERE occurred_at >= now() - INTERVAL 52 WEEK
GROUP BY warehouse_id, sku, week
ORDER BY sku, week;
```

## Days of Supply Remaining

```sql
WITH daily_demand AS (
    SELECT
        warehouse_id,
        sku,
        avg(daily_qty) AS avg_daily_demand
    FROM (
        SELECT
            warehouse_id,
            sku,
            toDate(occurred_at) AS day,
            sum(quantity)        AS daily_qty
        FROM demand_events
        WHERE occurred_at >= now() - INTERVAL 30 DAY
        GROUP BY warehouse_id, sku, day
    )
    GROUP BY warehouse_id, sku
),
current_stock AS (
    SELECT
        warehouse_id,
        sku,
        quantity_on_hand - quantity_reserved AS available
    FROM inventory_snapshots
    WHERE snapshot_at = (SELECT max(snapshot_at) FROM inventory_snapshots)
)
SELECT
    s.warehouse_id,
    s.sku,
    s.available,
    d.avg_daily_demand,
    round(s.available / nullIf(d.avg_daily_demand, 0), 1) AS days_of_supply
FROM current_stock AS s
JOIN daily_demand AS d ON s.warehouse_id = d.warehouse_id AND s.sku = d.sku
ORDER BY days_of_supply
LIMIT 50;
```

## Cost Analysis by Category

```sql
SELECT
    i.category,
    sum(i.quantity_on_hand * i.unit_cost_usd)   AS inventory_value_usd,
    sum(d.quantity)                              AS units_sold_30d,
    sum(d.quantity * d.unit_price_usd)           AS revenue_30d_usd
FROM inventory_snapshots AS i
LEFT JOIN demand_events AS d
    ON i.sku = d.sku AND i.warehouse_id = d.warehouse_id
    AND d.occurred_at >= now() - INTERVAL 30 DAY
WHERE i.snapshot_at = (SELECT max(snapshot_at) FROM inventory_snapshots)
GROUP BY i.category
ORDER BY inventory_value_usd DESC;
```

## Materialized View for Daily Demand Summary

```sql
CREATE MATERIALIZED VIEW demand_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (warehouse_id, sku, channel, day)
AS
SELECT
    warehouse_id,
    sku,
    channel,
    toDate(occurred_at)         AS day,
    sum(quantity)               AS units_sold,
    sum(quantity * unit_price_usd) AS revenue_usd,
    count()                     AS order_count
FROM demand_events
GROUP BY warehouse_id, sku, channel, day;
```

## Conclusion

ClickHouse provides supply chain analysts with the performance needed to run complex, multi-table queries across years of historical data. The schema patterns shown here - separate tables for inventory snapshots, shipment events, purchase orders, and demand - map cleanly to the append-only write patterns that ClickHouse handles best. Materialized views keep recurring reports fast without re-scanning raw tables on every request.

**Related Reading:**

- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)
- [How to Build a Machine Learning Feature Store with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ml-feature-store/view)
