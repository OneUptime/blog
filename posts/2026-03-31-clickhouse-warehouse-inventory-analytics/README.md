# How to Build Warehouse Inventory Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Warehouse, Inventory, Analytics, SKU, Supply Chain

Description: Build warehouse inventory analytics in ClickHouse to track stock levels, turnover rates, dead stock, and replenishment needs across locations.

---

Warehouse inventory analytics requires tracking stock movements - receipts, picks, putaways, and adjustments - to maintain accurate on-hand quantities and optimize replenishment. ClickHouse handles high-frequency inventory events efficiently.

## Inventory Events Table

```sql
CREATE TABLE inventory_events (
    event_id     UUID,
    warehouse_id LowCardinality(String),
    sku          String,
    product_name String,
    category     LowCardinality(String),
    event_type   LowCardinality(String),  -- receipt, pick, putaway, adjustment, return
    quantity     Int32,  -- positive for in, negative for out
    unit_cost    Decimal64(2),
    event_at     DateTime,
    operator_id  String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_at)
ORDER BY (warehouse_id, sku, event_at);
```

## Current On-Hand Inventory

Sum all movements to get current stock per SKU per warehouse:

```sql
SELECT
    warehouse_id,
    sku,
    product_name,
    sum(quantity) AS on_hand_qty,
    sum(quantity * unit_cost) AS inventory_value
FROM inventory_events
GROUP BY warehouse_id, sku, product_name
HAVING on_hand_qty > 0
ORDER BY inventory_value DESC;
```

## Inventory Turnover Rate

Calculate how many times inventory turns over per quarter:

```sql
SELECT
    warehouse_id,
    sku,
    abs(sumIf(quantity, event_type = 'pick')) AS units_sold_90d,
    avg(on_hand) AS avg_on_hand,
    round(units_sold_90d / nullIf(avg_on_hand, 0), 2) AS turnover_rate
FROM (
    SELECT
        warehouse_id,
        sku,
        event_type,
        quantity,
        sum(quantity) OVER (PARTITION BY warehouse_id, sku ORDER BY event_at) AS on_hand
    FROM inventory_events
    WHERE event_at >= today() - 90
)
GROUP BY warehouse_id, sku
ORDER BY turnover_rate;
```

## Dead Stock Identification

Find SKUs with no movement in 90 days:

```sql
SELECT
    warehouse_id,
    sku,
    product_name,
    sum(quantity) AS on_hand_qty,
    max(event_at) AS last_movement,
    today() - toDate(max(event_at)) AS days_since_movement
FROM inventory_events
GROUP BY warehouse_id, sku, product_name
HAVING on_hand_qty > 0
   AND days_since_movement > 90
ORDER BY days_since_movement DESC;
```

## Reorder Point Alert

Identify SKUs below safety stock levels:

```sql
SELECT
    warehouse_id,
    sku,
    product_name,
    sum(quantity) AS on_hand_qty,
    50 AS safety_stock_threshold,  -- adjust per SKU in production
    on_hand_qty < safety_stock_threshold AS needs_reorder
FROM inventory_events
GROUP BY warehouse_id, sku, product_name
HAVING needs_reorder = 1
ORDER BY on_hand_qty;
```

## Daily Inventory Movement Summary

```sql
SELECT
    warehouse_id,
    toDate(event_at) AS movement_date,
    sumIf(quantity, event_type = 'receipt') AS receipts,
    abs(sumIf(quantity, event_type = 'pick')) AS picks,
    sumIf(quantity, event_type = 'return') AS returns,
    sumIf(quantity, event_type = 'adjustment') AS adjustments
FROM inventory_events
WHERE event_at >= today() - 30
GROUP BY warehouse_id, movement_date
ORDER BY warehouse_id, movement_date;
```

## Summary

ClickHouse enables real-time warehouse inventory analytics by aggregating stock events into on-hand quantities, turnover rates, and replenishment signals. Fast aggregations over event-sourced inventory data make it easy to identify dead stock, monitor stock levels, and optimize warehouse operations.
