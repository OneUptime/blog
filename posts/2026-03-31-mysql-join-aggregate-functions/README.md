# How to Use JOIN with Aggregate Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Join, Aggregate Function, Database, Query

Description: Learn how to combine JOIN with aggregate functions like COUNT, SUM, AVG, MIN, and MAX in MySQL to produce summary reports across multiple related tables.

---

Combining `JOIN` with aggregate functions is one of the most common patterns in reporting queries. You join tables to bring related data together, then aggregate to produce totals, counts, and averages.

## Schema

```sql
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100),
    region      VARCHAR(30)
);

CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    status      VARCHAR(20)
);

CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT,
    product_id INT,
    quantity   INT,
    unit_price DECIMAL(10,2)
);

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name       VARCHAR(100),
    category   VARCHAR(60)
);
```

## COUNT: how many orders per customer

```sql
SELECT
    c.name,
    COUNT(o.order_id) AS total_orders
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
ORDER BY total_orders DESC;
```

Using `LEFT JOIN` ensures customers with zero orders are counted as 0 rather than excluded. `COUNT(o.order_id)` counts non-NULL values, so unmatched rows count as 0.

## SUM: total revenue per customer

```sql
SELECT
    c.name,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM customers c
INNER JOIN orders      o  ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id    = oi.order_id
GROUP BY c.customer_id, c.name
ORDER BY total_revenue DESC;
```

## AVG: average order value per region

```sql
SELECT
    c.region,
    ROUND(AVG(order_total), 2) AS avg_order_value
FROM customers c
INNER JOIN (
    SELECT order_id, customer_id, SUM(quantity * unit_price) AS order_total
    FROM orders o
    INNER JOIN order_items oi USING (order_id)
    GROUP BY order_id, customer_id
) AS totals ON c.customer_id = totals.customer_id
GROUP BY c.region
ORDER BY avg_order_value DESC;
```

## MIN and MAX: first and last order dates

```sql
SELECT
    c.name,
    MIN(o.order_date) AS first_order,
    MAX(o.order_date) AS last_order,
    DATEDIFF(MAX(o.order_date), MIN(o.order_date)) AS customer_lifespan_days
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;
```

## COUNT DISTINCT: unique products per customer

```sql
SELECT
    c.name,
    COUNT(DISTINCT oi.product_id) AS unique_products_bought
FROM customers c
INNER JOIN orders      o  ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id    = oi.order_id
GROUP BY c.customer_id, c.name
ORDER BY unique_products_bought DESC;
```

## Multiple aggregates in one query

```sql
SELECT
    c.name                                            AS customer,
    COUNT(DISTINCT o.order_id)                        AS order_count,
    SUM(oi.quantity * oi.unit_price)                  AS total_spent,
    ROUND(AVG(oi.quantity * oi.unit_price), 2)        AS avg_item_value,
    MAX(o.order_date)                                 AS last_order_date
FROM customers c
INNER JOIN orders      o  ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id    = oi.order_id
GROUP BY c.customer_id, c.name;
```

## Aggregating on a joined lookup table

```sql
SELECT
    p.category,
    SUM(oi.quantity)                         AS units_sold,
    SUM(oi.quantity * oi.unit_price)         AS revenue
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.product_id
GROUP BY p.category
ORDER BY revenue DESC;
```

## Filtering aggregated results with HAVING

```sql
SELECT
    c.name,
    COUNT(o.order_id)                AS order_count,
    SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
INNER JOIN orders      o  ON c.customer_id = o.customer_id
INNER JOIN order_items oi ON o.order_id    = oi.order_id
GROUP BY c.customer_id, c.name
HAVING total_spent > 1000
ORDER BY total_spent DESC;
```

`HAVING` filters on the result of the aggregation; `WHERE` filters rows before aggregation.

## Common mistake: forgetting non-aggregated columns in GROUP BY

Every column in `SELECT` that is not wrapped in an aggregate function must either appear in `GROUP BY` or be functionally dependent on a `GROUP BY` column. MySQL 8 recognises functional dependencies from primary keys, so grouping by a table's primary key allows selecting any column from that table. However, grouping by a non-key column does not cover other columns:

```sql
-- Wrong: c.name is not functionally dependent on c.region
SELECT c.name, c.region, COUNT(o.order_id)
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.region;

-- Correct
SELECT c.name, c.region, COUNT(o.order_id)
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.region;
```

MySQL's `ONLY_FULL_GROUP_BY` mode (default in MySQL 8) enforces this and raises an error if violated.

## Summary

Use `JOIN` with aggregate functions by joining all necessary tables first, then applying `GROUP BY` with the dimensions you want to summarise on. Use `COUNT(column)` rather than `COUNT(*)` when you need NULL-aware counting, and always include all non-aggregated `SELECT` columns in `GROUP BY` to satisfy `ONLY_FULL_GROUP_BY` mode.
