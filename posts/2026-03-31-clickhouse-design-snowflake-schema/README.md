# How to Design a Snowflake Schema in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Snowflake Schema, Data Warehouse, Schema Design, Normalization, Analytics

Description: Learn how to design a snowflake schema in ClickHouse, with normalized dimension tables and strategies to maintain analytical query performance.

---

A snowflake schema extends the star schema by normalizing dimension tables into sub-dimensions. While this reduces storage redundancy, it increases query complexity. In ClickHouse, careful use of dictionaries and materialized views can preserve query performance despite the extra joins.

## Snowflake Schema Structure

```text
                   dim_date
                      |
dim_sub_category - dim_product - fact_sales
                      |
                   dim_brand

dim_city - dim_region - dim_customer
```

## Designing the Normalized Dimensions

Break down a flat dimension into normalized sub-dimensions:

```sql
-- Hierarchy: product -> (brand, category)
CREATE TABLE dim_brand (
    brand_id UInt32,
    brand_name String,
    country String
) ENGINE = MergeTree()
ORDER BY brand_id;

CREATE TABLE dim_category (
    category_id UInt16,
    category_name String,
    department String
) ENGINE = MergeTree()
ORDER BY category_id;

CREATE TABLE dim_product (
    product_id UInt32,
    product_name String,
    brand_id UInt32,
    category_id UInt16,
    unit_cost Decimal64(2)
) ENGINE = MergeTree()
ORDER BY product_id;
```

```sql
-- Geographic hierarchy: customer -> city -> country
CREATE TABLE dim_country (
    country_id UInt16,
    country_name String,
    region String
) ENGINE = MergeTree()
ORDER BY country_id;

CREATE TABLE dim_city (
    city_id UInt32,
    city_name String,
    country_id UInt16,
    timezone String
) ENGINE = MergeTree()
ORDER BY city_id;

CREATE TABLE dim_customer (
    customer_id UInt64,
    name String,
    city_id UInt32,
    segment String
) ENGINE = MergeTree()
ORDER BY customer_id;
```

## Querying Multi-Level Dimensions

```sql
SELECT
    dc.country_name,
    cat.department,
    sum(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_city city ON c.city_id = city.city_id
JOIN dim_country dc ON city.country_id = dc.country_id
JOIN dim_product p ON f.product_id = p.product_id
JOIN dim_category cat ON p.category_id = cat.category_id
WHERE f.date_key >= 20250101
GROUP BY dc.country_name, cat.department
ORDER BY revenue DESC;
```

## Flattening with Materialized Views

To avoid deep join chains at query time, pre-flatten dimensions into a denormalized view:

```sql
CREATE MATERIALIZED VIEW flat_product_dim
ENGINE = ReplacingMergeTree()
ORDER BY product_id
AS
SELECT
    p.product_id,
    p.product_name,
    b.brand_name,
    b.country AS brand_country,
    c.category_name,
    c.department
FROM dim_product p
JOIN dim_brand b ON p.brand_id = b.brand_id
JOIN dim_category c ON p.category_id = c.category_id;
```

Now queries against `fact_sales` only need one join:

```sql
SELECT
    fpd.department,
    sum(f.revenue) AS revenue
FROM fact_sales f
JOIN flat_product_dim fpd ON f.product_id = fpd.product_id
GROUP BY fpd.department;
```

## Using Chained Dictionaries

Another approach - use dictionaries that lookup into other dictionaries:

```sql
-- Look up product, then category from product
SELECT
    dictGet('product_dict', 'category_id', product_id) AS category_id,
    dictGet('category_dict', 'department',
        toUInt64(dictGet('product_dict', 'category_id', product_id))
    ) AS department,
    sum(revenue)
FROM fact_sales
GROUP BY category_id, department;
```

## Summary

Snowflake schemas in ClickHouse preserve normalization benefits but introduce query complexity through multi-level joins. Mitigate this with pre-flattened materialized views and chained dictionaries, which absorb the join cost at data-load time rather than at query time.
