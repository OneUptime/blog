# How to Use CREATE TABLE ... SELECT in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CREATE TABLE SELECT, DDL, Table Creation, Data Migration

Description: Learn how to use CREATE TABLE ... SELECT in MySQL to create a new table and populate it with data from an existing query in a single statement.

---

## What Is CREATE TABLE ... SELECT?

`CREATE TABLE ... SELECT` creates a new table and populates it with the results of a SELECT query in one statement. The new table's structure is inferred from the SELECT result - column names, types, and widths are derived automatically. The NOT NULL attribute is preserved for directly-selected columns, but constraints like PRIMARY KEY, UNIQUE, indexes, AUTO_INCREMENT, and DEFAULT values are NOT copied.

```sql
-- Create a new table with data from an existing table
CREATE TABLE products_backup
SELECT * FROM products;
```

## Basic Syntax

```sql
-- Create table with all columns from source
CREATE TABLE orders_archive
SELECT * FROM orders WHERE order_date < '2024-01-01';

-- Create table with selected columns
CREATE TABLE customer_emails
SELECT id, email, LOWER(email) AS email_lower
FROM customers
WHERE email IS NOT NULL;
```

## Defining the Structure Explicitly

Combine `CREATE TABLE` structure definition with `SELECT` to get both constraints and data:

```sql
-- Define structure AND populate with data
CREATE TABLE top_products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    total_revenue DECIMAL(12, 2),
    INDEX idx_category (category)
)
SELECT
    p.id,
    p.name,
    p.category,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name, p.category
ORDER BY total_revenue DESC
LIMIT 100;
```

## CREATE TABLE ... SELECT vs CREATE TABLE ... LIKE

```sql
-- LIKE: copies the full structure (including indexes, constraints, AUTO_INCREMENT)
-- but copies NO data
CREATE TABLE orders_copy LIKE orders;

-- SELECT: infers structure from query result, copies data but NOT constraints/indexes
CREATE TABLE orders_copy2 SELECT * FROM orders;

-- Best practice: combine LIKE and INSERT ... SELECT for full copies
CREATE TABLE orders_copy3 LIKE orders;
INSERT INTO orders_copy3 SELECT * FROM orders;
```

## Transforming Data During Table Creation

```sql
-- Build a denormalized analytics table
CREATE TABLE sales_analytics
SELECT
    o.id AS order_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.country,
    o.total_amount,
    o.order_date,
    YEAR(o.order_date) AS order_year,
    MONTH(o.order_date) AS order_month,
    CASE
        WHEN o.total_amount > 1000 THEN 'high'
        WHEN o.total_amount > 200  THEN 'medium'
        ELSE 'low'
    END AS value_tier
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'completed';
```

## Creating Summary or Aggregate Tables

```sql
-- Create a monthly sales summary table
CREATE TABLE monthly_sales_summary
SELECT
    YEAR(order_date) AS year,
    MONTH(order_date) AS month,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS revenue,
    AVG(total_amount) AS avg_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
GROUP BY YEAR(order_date), MONTH(order_date)
ORDER BY year, month;
```

## IF NOT EXISTS Option

```sql
-- Only create if table does not already exist
CREATE TABLE IF NOT EXISTS temp_results
SELECT id, name, score
FROM quiz_attempts
WHERE quiz_id = 5 AND completed = 1;
```

## Temporary Tables

```sql
-- Create a temporary table (auto-deleted at session end)
CREATE TEMPORARY TABLE session_cart
SELECT p.id, p.name, p.price, ci.quantity
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.session_id = 'abc123';

-- Use it in the same session
SELECT * FROM session_cart WHERE price > 50;
```

## Important Limitations

```sql
-- Limitations of CREATE TABLE ... SELECT:
-- 1. No PRIMARY KEY or UNIQUE constraints are copied (NOT NULL is preserved)
-- 2. No AUTO_INCREMENT attribute on inferred columns
-- 3. No indexes from the source table
-- 4. Column types may differ from original (e.g., computed columns get VARCHAR)
-- 5. DEFAULT values and column comments are not preserved

-- Always verify the created structure:
DESCRIBE products_backup;
SHOW CREATE TABLE products_backup;
```

## Summary

`CREATE TABLE ... SELECT` is a convenient shortcut for quickly building new tables from query results - ideal for analytics tables, backups, staging areas, and derived datasets. Remember that it does not copy PRIMARY KEY, UNIQUE constraints, indexes, or AUTO_INCREMENT settings from the source (though NOT NULL is preserved for directly-selected columns). For production tables that need proper structure, define the columns explicitly and use the SELECT clause only for the data population portion.
