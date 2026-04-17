# How to Design a Fact Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fact Table, Schema Design, Data Warehouse, MergeTree, Analytics

Description: Learn how to design efficient fact tables in ClickHouse with proper ordering keys, partitioning, and pre-aggregation strategies for analytical workloads.

---

The fact table is the central table in a data warehouse schema. It stores quantitative measurements and foreign keys to dimension tables. In ClickHouse, designing the fact table correctly is critical for query performance, storage efficiency, and ingestion throughput.

## Anatomy of a ClickHouse Fact Table

```sql
CREATE TABLE fact_orders (
    -- Surrogate key (optional in ClickHouse)
    order_id String,

    -- Dimension foreign keys
    date_key UInt32,        -- YYYYMMDD
    customer_id UInt64,
    product_id UInt32,
    store_id UInt32,

    -- Degenerate dimensions (low cardinality facts with no separate dimension)
    channel LowCardinality(String),
    currency LowCardinality(String),

    -- Measures (additive facts)
    quantity UInt32,
    unit_price Decimal64(2),
    discount Decimal64(2),
    revenue Decimal64(2),
    cost Decimal64(2),
    profit Decimal64(2),

    -- Timestamps
    ordered_at DateTime,
    shipped_at Nullable(DateTime),
    delivered_at Nullable(DateTime)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ordered_at)
ORDER BY (date_key, customer_id, product_id)
TTL ordered_at + INTERVAL 5 YEAR;
```

## Choosing the ORDER BY Key

The ORDER BY key determines how data is physically sorted on disk. Choose based on your most common filter and GROUP BY patterns:

```sql
-- If you mostly query by date and region:
ORDER BY (date_key, region, customer_id)

-- If you mostly query by customer journey:
ORDER BY (customer_id, ordered_at)

-- If you mostly query by product performance:
ORDER BY (product_id, ordered_at)
```

## Additive vs. Semi-Additive vs. Non-Additive Facts

```text
Additive (can SUM across all dimensions):
  - revenue, quantity, cost

Semi-additive (can SUM across some dimensions, not time):
  - account_balance, inventory_count

Non-additive (cannot SUM):
  - ratios, percentages, averages
```

For semi-additive facts, store the raw value and compute ratios at query time:

```sql
-- Store balance snapshots, not balance changes
CREATE TABLE account_balance_snapshots (
    snapshot_date Date,
    account_id UInt64,
    balance Decimal64(2)
) ENGINE = ReplacingMergeTree(snapshot_date)
ORDER BY (account_id, snapshot_date);
```

## Pre-Aggregated Fact Tables

For commonly run rollups, pre-aggregate into summary fact tables:

```sql
CREATE TABLE fact_orders_daily (
    order_date Date,
    customer_id UInt64,
    product_category LowCardinality(String),
    total_revenue Decimal64(2),
    total_quantity UInt64,
    order_count UInt32
) ENGINE = SummingMergeTree((total_revenue, total_quantity, order_count))
ORDER BY (order_date, customer_id, product_category);

-- Populate from granular fact table
INSERT INTO fact_orders_daily
SELECT
    toDate(ordered_at),
    customer_id,
    product_category,
    sum(revenue),
    sum(quantity),
    count()
FROM fact_orders f
JOIN dim_product p ON f.product_id = p.product_id
GROUP BY 1, 2, 3;
```

## Handling NULL Measures

Prefer zeros over NULLs in fact tables for simpler aggregations:

```sql
CREATE TABLE fact_sales (
    order_id String,
    revenue Decimal64(2) DEFAULT 0,
    discount Decimal64(2) DEFAULT 0,
    -- Use 0 for unknown numeric facts
    days_to_ship UInt16 DEFAULT 0
) ENGINE = MergeTree()
ORDER BY order_id;
```

## Summary

Fact table design in ClickHouse requires careful selection of the ORDER BY key based on query access patterns, appropriate partitioning for TTL and partition pruning, and pre-aggregated summary tables for common rollups. Keep dimension data out of the fact table unless denormalization is explicitly chosen for query performance.
