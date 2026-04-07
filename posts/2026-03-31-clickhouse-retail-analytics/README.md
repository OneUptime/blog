# How to Use ClickHouse for Retail Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Retail Analytics, E-Commerce, Sales Analysis, Analytics

Description: Build a retail analytics platform with ClickHouse to analyze sales trends, inventory turnover, customer behavior, and product performance at scale.

---

## Retail Analytics Use Cases for ClickHouse

Retail generates massive volumes of transaction, inventory, and clickstream data. ClickHouse excels here because retail analytics queries - sales rollups, cohort analysis, and product performance - are exactly the aggregation-heavy OLAP workloads ClickHouse is built for.

## Schema Design for Retail

```sql
CREATE TABLE retail_transactions
(
    transaction_id UInt64,
    transaction_time DateTime,
    store_id UInt32,
    customer_id UInt64,
    product_id UInt64,
    category LowCardinality(String),
    quantity UInt16,
    unit_price Decimal(10, 2),
    discount_pct Float32,
    total_amount Decimal(10, 2),
    payment_method LowCardinality(String),
    region LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(transaction_time)
ORDER BY (store_id, transaction_time, product_id);
```

## Sales Performance by Category

```sql
SELECT
    category,
    toStartOfWeek(transaction_time) AS week,
    sum(total_amount) AS revenue,
    sum(quantity) AS units_sold,
    count(DISTINCT customer_id) AS unique_buyers,
    avg(unit_price) AS avg_price
FROM retail_transactions
WHERE transaction_time >= today() - 90
GROUP BY category, week
ORDER BY week, revenue DESC;
```

## Customer Purchase Frequency Analysis

```sql
WITH customer_purchases AS (
    SELECT
        customer_id,
        count() AS purchase_count,
        sum(total_amount) AS lifetime_value,
        min(transaction_time) AS first_purchase,
        max(transaction_time) AS last_purchase
    FROM retail_transactions
    WHERE transaction_time >= today() - 365
    GROUP BY customer_id
)
SELECT
    multiIf(
        purchase_count = 1, 'One-time',
        purchase_count <= 3, 'Occasional',
        purchase_count <= 10, 'Regular',
        'Loyal'
    ) AS segment,
    count() AS customer_count,
    avg(lifetime_value) AS avg_ltv,
    avg(purchase_count) AS avg_purchases
FROM customer_purchases
GROUP BY segment
ORDER BY avg_ltv DESC;
```

## Basket Size and Cross-Sell Analysis

```sql
-- Average basket size per store
SELECT
    store_id,
    region,
    avg(basket_amount) AS avg_basket_value,
    avg(basket_items) AS avg_items_per_basket
FROM (
    SELECT
        store_id,
        region,
        transaction_id,
        sum(total_amount) AS basket_amount,
        sum(quantity) AS basket_items
    FROM retail_transactions
    WHERE toDate(transaction_time) = today() - 1
    GROUP BY store_id, region, transaction_id
)
GROUP BY store_id, region
ORDER BY avg_basket_value DESC;
```

## Inventory Turnover Analysis

```sql
CREATE TABLE inventory_snapshots
(
    snapshot_date Date,
    store_id UInt32,
    product_id UInt64,
    quantity_on_hand UInt32,
    reorder_level UInt32,
    cost_per_unit Decimal(10, 2)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (store_id, product_id, snapshot_date);
```

```sql
-- Identify slow-moving inventory (turnover < 1x per month)
SELECT
    i.product_id,
    avg(i.quantity_on_hand) AS avg_stock,
    coalesce(sum(t.quantity), 0) AS units_sold_30d,
    round(coalesce(sum(t.quantity), 0) / nullIf(avg(i.quantity_on_hand), 0), 2) AS turnover_ratio
FROM inventory_snapshots AS i
LEFT JOIN retail_transactions AS t
    ON i.product_id = t.product_id
    AND i.store_id = t.store_id
    AND t.transaction_time >= today() - 30
WHERE i.snapshot_date = today() - 1
GROUP BY i.product_id
HAVING turnover_ratio < 1
ORDER BY avg_stock DESC;
```

## Summary

ClickHouse makes retail analytics fast and cost-effective. Model your transactions with partition by month and sort by store plus time, then build queries for sales rollups, customer segmentation, basket analysis, and inventory turnover. The columnar storage and vectorized aggregations handle billions of transaction rows while returning dashboard results in seconds.
