# How to Design a Slowly Changing Dimension (SCD) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Slowly Changing Dimension, SCD, Schema Design, Data Warehouse, History

Description: Learn how to implement Slowly Changing Dimension patterns in ClickHouse to track historical attribute changes for analytical accuracy.

---

Slowly Changing Dimensions (SCDs) handle dimension records whose attributes change over time. For example, a customer moving from one country to another, or a product changing its category. ClickHouse supports several SCD patterns, each with different tradeoffs.

## SCD Type 1: Overwrite

The simplest approach - just update the current value. No history is kept.

In ClickHouse, use `ReplacingMergeTree`:

```sql
CREATE TABLE dim_customer_scd1 (
    customer_id UInt64,
    name String,
    country String,
    segment String,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY customer_id;

-- "Update" by inserting a new row with the same customer_id
INSERT INTO dim_customer_scd1 VALUES (1001, 'Alice', 'DE', 'Enterprise', now());
```

Query with FINAL to get latest version:

```sql
SELECT * FROM dim_customer_scd1 FINAL;
```

## SCD Type 2: Add New Row

Keep full history with effective date ranges:

```sql
CREATE TABLE dim_customer_scd2 (
    surrogate_key UInt64,
    customer_id UInt64,
    name String,
    country String,
    segment String,
    effective_from DateTime,
    effective_to DateTime DEFAULT toDateTime('2099-12-31 23:59:59'),
    is_current Bool DEFAULT true
) ENGINE = MergeTree()
ORDER BY (customer_id, effective_from);

-- Original record
INSERT INTO dim_customer_scd2 VALUES (1, 1001, 'Alice', 'US', 'SMB', '2023-01-01', '2099-12-31 23:59:59', true);

-- When customer moves countries: expire old record, insert new
INSERT INTO dim_customer_scd2 VALUES
    (1, 1001, 'Alice', 'US', 'SMB', '2023-01-01', '2025-06-30', false),
    (2, 1001, 'Alice', 'DE', 'Enterprise', '2025-07-01', '2099-12-31 23:59:59', true);
```

Query current state:

```sql
SELECT * FROM dim_customer_scd2 WHERE is_current = true;
```

Query as of a specific date:

```sql
SELECT * FROM dim_customer_scd2
WHERE customer_id = 1001
  AND effective_from <= '2024-01-01'
  AND effective_to > '2024-01-01';
```

## SCD Type 2 with Versioning

Use an integer version instead of date ranges:

```sql
CREATE TABLE dim_product_versioned (
    product_id UInt32,
    version UInt32,
    name String,
    category String,
    price Decimal64(2),
    valid_from Date,
    valid_to Date
) ENGINE = MergeTree()
ORDER BY (product_id, version);
```

## SCD Type 4: History Table

Keep a separate history table:

```sql
-- Current dimension
CREATE TABLE dim_customer (
    customer_id UInt64,
    name String,
    country String,
    segment String,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY customer_id;

-- History table
CREATE TABLE dim_customer_history (
    customer_id UInt64,
    name String,
    country String,
    segment String,
    changed_at DateTime,
    changed_by String
) ENGINE = MergeTree()
ORDER BY (customer_id, changed_at);
```

## Joining Facts with SCD Type 2

Point-in-time join with the correct historical dimension:

```sql
SELECT
    f.order_id,
    f.order_date,
    f.revenue,
    c.country AS customer_country_at_order_time
FROM fact_sales f
JOIN dim_customer_scd2 c
    ON f.customer_id = c.customer_id
    AND f.order_date >= toDate(c.effective_from)
    AND f.order_date < toDate(c.effective_to);
```

## Summary

ClickHouse supports all common SCD patterns. SCD Type 1 is simplest with `ReplacingMergeTree`. SCD Type 2 provides full historical accuracy with effective date ranges and is essential for correct point-in-time analytics. Choose based on whether historical accuracy is required for your analytical use cases.
