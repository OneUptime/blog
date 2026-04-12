# How to Create Star Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Star Schema, Data Warehouse, Dimension

Description: Learn how to design and implement a star schema in MySQL with fact and dimension tables, surrogate keys, and optimized joins for analytical queries.

---

## What Is a Star Schema

A star schema organizes data into one central fact table surrounded by denormalized dimension tables. The shape resembles a star: fact table at the center, dimension tables radiating outward. This model reduces the number of joins needed for analytical queries and makes SQL straightforward to read and write.

## When to Use Star Schema in MySQL

Star schema works well when:
- Query patterns are known and mostly aggregation-based
- Read performance matters more than write efficiency
- Teams want simple, self-documenting SQL

## Designing the Tables

The fact table stores measurable events (sales, clicks, orders). Each row contains foreign keys to dimension tables and numeric measures.

```sql
-- Customer dimension
CREATE TABLE dim_customer (
  customer_key  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id   VARCHAR(50)  NOT NULL,
  full_name     VARCHAR(200) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  segment       VARCHAR(50)  NOT NULL,
  UNIQUE KEY uq_customer_id (customer_id)
) ENGINE=InnoDB;

-- Product dimension
CREATE TABLE dim_product (
  product_key  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sku          VARCHAR(50)  NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category     VARCHAR(100) NOT NULL,
  subcategory  VARCHAR(100) NOT NULL,
  unit_cost    DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uq_sku (sku)
) ENGINE=InnoDB;

-- Date dimension
CREATE TABLE dim_date (
  date_key   INT     NOT NULL PRIMARY KEY,
  full_date  DATE    NOT NULL,
  year       SMALLINT NOT NULL,
  quarter    TINYINT  NOT NULL,
  month      TINYINT  NOT NULL,
  week       TINYINT  NOT NULL,
  day_name   VARCHAR(10) NOT NULL
) ENGINE=InnoDB;

-- Central fact table
CREATE TABLE fact_orders (
  order_id      BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  date_key      INT           NOT NULL,
  customer_key  BIGINT        NOT NULL,
  product_key   BIGINT        NOT NULL,
  quantity      INT           NOT NULL DEFAULT 0,
  unit_price    DECIMAL(10,2) NOT NULL,
  discount      DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  revenue       DECIMAL(12,2) NOT NULL,
  INDEX idx_date     (date_key),
  INDEX idx_customer (customer_key),
  INDEX idx_product  (product_key),
  CONSTRAINT fk_date     FOREIGN KEY (date_key)     REFERENCES dim_date(date_key),
  CONSTRAINT fk_customer FOREIGN KEY (customer_key) REFERENCES dim_customer(customer_key),
  CONSTRAINT fk_product  FOREIGN KEY (product_key)  REFERENCES dim_product(product_key)
) ENGINE=InnoDB;
```

## Populating Dimensions

Use `INSERT ... ON DUPLICATE KEY UPDATE` to upsert dimension rows during ETL:

```sql
INSERT INTO dim_customer (customer_id, full_name, email, city, country, segment)
VALUES ('C-1001', 'Alice Brown', 'alice@example.com', 'Austin', 'US', 'Enterprise')
AS new_vals
ON DUPLICATE KEY UPDATE
  full_name = new_vals.full_name,
  email     = new_vals.email,
  segment   = new_vals.segment;
```

## Querying the Star Schema

```sql
-- Quarterly revenue per customer segment
SELECT
  d.year,
  d.quarter,
  c.segment,
  SUM(f.revenue)  AS total_revenue,
  COUNT(*)        AS order_count,
  AVG(f.revenue)  AS avg_order_value
FROM fact_orders    f
JOIN dim_date       d ON d.date_key     = f.date_key
JOIN dim_customer   c ON c.customer_key = f.customer_key
WHERE d.year = 2025
GROUP BY d.year, d.quarter, c.segment
ORDER BY d.quarter, total_revenue DESC;
```

## Indexing Strategy

Add composite indexes on the fact table that match common filter-then-aggregate patterns:

```sql
-- Speeds up date-range + product category aggregations
ALTER TABLE fact_orders
  ADD INDEX idx_date_product (date_key, product_key, revenue);

-- Speeds up customer segment roll-ups
ALTER TABLE fact_orders
  ADD INDEX idx_date_customer (date_key, customer_key, revenue);
```

## Summary

A star schema in MySQL separates measurements from descriptive context, enabling fast aggregation queries with simple joins. Use surrogate integer keys, denormalize dimension tables to avoid extra joins, and build covering indexes that match your most frequent query patterns. This structure remains readable and maintainable as the data grows.
