# How to Design a Star Schema in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Star Schema, Data Warehouse, Schema Design, Fact Table, Dimension Table

Description: Learn how to design a star schema in ClickHouse, adapting classical data warehouse patterns to ClickHouse's columnar storage model.

---

A star schema organizes data into a central fact table surrounded by dimension tables. While ClickHouse favors denormalized wide tables for maximum performance, star schemas are still viable when you need to balance storage and query flexibility.

## Classic Star Schema Structure

```text
            dim_date
               |
dim_product - fact_sales - dim_customer
               |
            dim_store
```

## Creating Dimension Tables

Dimension tables are typically small and stable:

```sql
CREATE TABLE dim_customer (
    customer_id UInt64,
    name String,
    email String,
    country String,
    segment String,
    created_at Date
) ENGINE = MergeTree()
ORDER BY customer_id;

CREATE TABLE dim_product (
    product_id UInt32,
    name String,
    category String,
    brand String,
    unit_price Decimal64(2)
) ENGINE = MergeTree()
ORDER BY product_id;

CREATE TABLE dim_date (
    date_key UInt32,  -- YYYYMMDD
    date Date,
    year UInt16,
    quarter UInt8,
    month UInt8,
    week UInt8,
    day_of_week UInt8,
    is_weekend Bool
) ENGINE = MergeTree()
ORDER BY date_key;
```

## Creating the Fact Table

The fact table stores measurements with foreign keys to dimensions:

```sql
CREATE TABLE fact_sales (
    sale_id UInt64,
    date_key UInt32,
    customer_id UInt64,
    product_id UInt32,
    store_id UInt32,
    quantity UInt32,
    unit_price Decimal64(2),
    discount Decimal64(2),
    revenue Decimal64(2)
) ENGINE = MergeTree()
PARTITION BY intDiv(date_key, 100)
ORDER BY (date_key, customer_id, product_id);
```

## Querying the Star Schema

ClickHouse handles joins differently than OLTP databases. Use dictionary-based lookups for dimension data when possible:

```sql
-- Standard join approach
SELECT
    d.year,
    dp.category,
    sum(f.revenue) AS total_revenue,
    count() AS transaction_count
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product dp ON f.product_id = dp.product_id
WHERE d.year = 2025
GROUP BY d.year, dp.category
ORDER BY total_revenue DESC;
```

## Optimizing with Dictionaries

For frequently joined small dimensions, use dictionaries to avoid joins entirely:

```sql
CREATE DICTIONARY product_dict (
    product_id UInt32,
    name String,
    category String
) PRIMARY KEY product_id
SOURCE(CLICKHOUSE(TABLE 'dim_product'))
LAYOUT(HASHED())
LIFETIME(3600);

-- Dimension lookup without JOIN
SELECT
    dictGet('product_dict', 'category', product_id) AS category,
    sum(revenue) AS total_revenue
FROM fact_sales
WHERE date_key >= 20250101
GROUP BY category
ORDER BY total_revenue DESC;
```

## When to Use Star Schema vs. Wide Tables

```text
Star Schema is better when:
- Dimensions change frequently
- Storage efficiency matters
- Multiple fact tables share dimensions

Wide Tables are better when:
- Maximum query speed is the priority
- Dimensions rarely change
- Simplicity is preferred over normalization
```

## Summary

Star schemas in ClickHouse work well for data warehouse use cases, especially when combined with dictionary-based dimension lookups to eliminate join overhead. For pure analytical performance, consider denormalizing into wide tables, but star schemas remain a solid choice when dimension reuse and storage efficiency are important.
