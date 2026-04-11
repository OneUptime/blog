# How to Use MySQL for Data Warehousing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Warehouse, Analytics, Query

Description: Learn how to design and implement a data warehouse using MySQL, including schema design, aggregation strategies, and query optimization for analytics.

---

## Why MySQL for Data Warehousing

MySQL is not a purpose-built analytical database, but it remains a practical choice for small to medium-scale data warehousing where teams already operate MySQL infrastructure. By applying the right schema patterns, indexing strategies, and query techniques, MySQL can serve as an effective analytical store without requiring additional tooling.

## Design Principles

A MySQL data warehouse typically relies on a dimensional model - separating factual measurements from descriptive attributes. Facts go into large, append-heavy tables; dimensions store descriptive context. This separation enables fast aggregation by filtering small dimension tables first and then joining to the fact table.

Key design rules:
- Use `BIGINT` surrogate keys on all dimension tables
- Keep fact table rows narrow (measurements + foreign keys only)
- Use `DATE` or `INT` date dimension keys for partition pruning
- Avoid nullable columns in fact tables to keep row sizes predictable

## Schema Example

```sql
-- Date dimension
CREATE TABLE dim_date (
  date_key    INT          NOT NULL PRIMARY KEY,
  full_date   DATE         NOT NULL,
  year        SMALLINT     NOT NULL,
  quarter     TINYINT      NOT NULL,
  month       TINYINT      NOT NULL,
  day_of_week TINYINT      NOT NULL
);

-- Product dimension
CREATE TABLE dim_product (
  product_key  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id   VARCHAR(50)  NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category     VARCHAR(100) NOT NULL,
  brand        VARCHAR(100) NOT NULL,
  UNIQUE KEY (product_id)
);

-- Sales fact table
CREATE TABLE fact_sales (
  sale_id      BIGINT    NOT NULL AUTO_INCREMENT,
  date_key     INT       NOT NULL,
  product_key  BIGINT    NOT NULL,
  customer_key BIGINT    NOT NULL,
  quantity     INT       NOT NULL,
  revenue      DECIMAL(12,2) NOT NULL,
  cost         DECIMAL(12,2) NOT NULL,
  INDEX idx_date    (date_key),
  INDEX idx_product (product_key),
  PRIMARY KEY (sale_id, date_key),
  INDEX idx_covering (date_key, product_key, revenue)
) ENGINE=InnoDB
  PARTITION BY RANGE (date_key) (
    PARTITION p2024 VALUES LESS THAN (20250101),
    PARTITION p2025 VALUES LESS THAN (20260101),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

## Loading Data Efficiently

Use `LOAD DATA INFILE` or bulk `INSERT` with `innodb_autoinc_lock_mode=2` for fast loads. Disable foreign key and uniqueness checks during the load to reduce overhead:

```sql
SET foreign_key_checks = 0;
SET unique_checks = 0;
LOAD DATA INFILE '/tmp/sales_2025.csv'
  INTO TABLE fact_sales
  FIELDS TERMINATED BY ','
  LINES TERMINATED BY '\n'
  (date_key, product_key, customer_key, quantity, revenue, cost);
SET unique_checks = 1;
SET foreign_key_checks = 1;
```

## Running Analytical Queries

```sql
-- Monthly revenue by category
SELECT
  d.year,
  d.month,
  p.category,
  SUM(f.revenue)            AS total_revenue,
  SUM(f.revenue - f.cost)   AS total_margin,
  COUNT(*)                  AS transaction_count
FROM fact_sales  f
JOIN dim_date    d ON d.date_key    = f.date_key
JOIN dim_product p ON p.product_key = f.product_key
WHERE d.year = 2025
GROUP BY d.year, d.month, p.category
ORDER BY d.month, total_revenue DESC;
```

Use `EXPLAIN` to verify partition pruning is active before running large scans (the `partitions` column in the output shows which partitions are accessed).

## Configuration for Analytics

```ini
[mysqld]
# Increase sort buffer for large ORDER BY / GROUP BY
sort_buffer_size        = 32M
# Allow more memory for join buffers
join_buffer_size        = 16M
# Larger read buffers for sequential scans
read_buffer_size        = 4M
read_rnd_buffer_size    = 8M
# Tune InnoDB buffer pool to hold the working set
innodb_buffer_pool_size = 8G
```

## Summary

MySQL can serve as a practical data warehouse for teams with moderate analytical requirements. The key is to adopt a dimensional model, partition fact tables by date, build covering indexes for common query patterns, and tune memory parameters for sequential scans. For workloads that outgrow MySQL, migrating to a columnar engine like ClickHouse or BigQuery becomes the logical next step.
