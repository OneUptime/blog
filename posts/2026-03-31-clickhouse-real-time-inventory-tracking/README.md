# How to Build Real-Time Inventory Tracking with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Inventory, Real-Time Analytics, Materialized View, Supply Chain

Description: Use ClickHouse to track inventory movements in real time, compute stock levels, and alert when items fall below reorder thresholds.

---

Inventory systems need to reflect stock changes within seconds of a warehouse event. ClickHouse's append-only MergeTree combined with SummingMergeTree views makes it straightforward to maintain live stock levels over millions of SKUs.

## Movement Table

```sql
CREATE TABLE inventory_movements
(
    warehouse_id UInt32,
    sku          LowCardinality(String),
    qty_delta    Int32,   -- positive = inbound, negative = outbound
    reason       LowCardinality(String),
    ts           DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (warehouse_id, sku, ts);
```

## Current Stock View

```sql
CREATE MATERIALIZED VIEW current_stock_mv
ENGINE = SummingMergeTree()
ORDER BY (warehouse_id, sku)
AS
SELECT
    warehouse_id,
    sku,
    sum(qty_delta) AS stock_on_hand
FROM inventory_movements
GROUP BY warehouse_id, sku;
```

## Query Stock Levels

```sql
SELECT
    warehouse_id,
    sku,
    sum(stock_on_hand) AS qty
FROM current_stock_mv
GROUP BY warehouse_id, sku
HAVING qty < 50  -- items below reorder point
ORDER BY qty ASC;
```

## Movement History for Auditing

```sql
SELECT
    ts,
    reason,
    qty_delta,
    sum(qty_delta) OVER (
        PARTITION BY warehouse_id, sku
        ORDER BY ts
        ROWS UNBOUNDED PRECEDING
    ) AS running_stock
FROM inventory_movements
WHERE warehouse_id = 1 AND sku = 'SKU-9900'
ORDER BY ts;
```

## Alerting on Low Stock

Expose the reorder query via the ClickHouse HTTP endpoint and call it from a cron job or a [OneUptime](https://oneuptime.com) scheduled monitor. When the JSON response contains items with `qty < 50`, trigger an on-call alert to the warehouse operations team.

```bash
curl -s "http://ch:8123/?query=SELECT+sku,sum(stock_on_hand)+FROM+current_stock_mv+GROUP+BY+sku+HAVING+sum(stock_on_hand)<%2050+FORMAT+JSONEachRow"
```

## Inbound Stream from Kafka

```sql
CREATE TABLE inventory_kafka
(
    warehouse_id UInt32,
    sku          String,
    qty_delta    Int32,
    reason       String,
    ts           DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'broker:9092',
    kafka_topic_list  = 'warehouse-events',
    kafka_group_name  = 'ch-inventory',
    kafka_format      = 'JSONEachRow';

CREATE MATERIALIZED VIEW inventory_kafka_mv TO inventory_movements AS
SELECT warehouse_id, sku, qty_delta, reason, ts
FROM inventory_kafka;
```

## Summary

A SummingMergeTree materialized view over raw movement events gives you a live stock-on-hand view across all SKUs and warehouses. ClickHouse handles the aggregation so your application only needs to query a small, always-current summary table.
