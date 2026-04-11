# What Is a View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, SQL, Query Abstraction, Security

Description: A view in MySQL is a named virtual table defined by a stored SELECT query that can be queried like a regular table without physically storing data.

---

## Overview

A view is a stored query in MySQL that presents data from one or more tables (or other views) as if it were a table. When you query a view, MySQL executes the underlying `SELECT` statement and returns the results. Views do not store data themselves -- they are virtual tables. They are useful for simplifying complex queries, enforcing security by restricting column and row access, and providing a stable interface when the underlying table structure changes.

## Creating a View

```sql
CREATE VIEW active_customers AS
SELECT
  id,
  name,
  email,
  created_at
FROM customers
WHERE status = 'active';
```

Query the view just like a table:

```sql
SELECT * FROM active_customers WHERE name LIKE 'A%';
```

## Views for Query Simplification

Views can encapsulate complex JOINs and aggregations:

```sql
CREATE VIEW customer_order_summary AS
SELECT
  c.id AS customer_id,
  c.name,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total), 0) AS lifetime_value
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

Downstream queries become simple:

```sql
SELECT * FROM customer_order_summary
WHERE lifetime_value > 1000
ORDER BY lifetime_value DESC;
```

## Updatable Views

Simple views (no `GROUP BY`, `DISTINCT`, aggregate functions, subqueries, or JOINs) are updatable -- you can run `INSERT`, `UPDATE`, and `DELETE` against them:

```sql
CREATE VIEW pending_orders AS
SELECT id, customer_id, total, status
FROM orders
WHERE status = 'pending';

-- Update through the view
UPDATE pending_orders SET status = 'cancelled' WHERE id = 101;
```

## WITH CHECK OPTION

Prevent inserting or updating rows that would not satisfy the view's WHERE clause:

```sql
CREATE VIEW high_value_orders AS
SELECT * FROM orders WHERE total > 500
WITH CHECK OPTION;

-- This would fail because total = 50 violates the view's condition
UPDATE high_value_orders SET total = 50 WHERE id = 200;
-- ERROR 1369 (HY000): CHECK OPTION failed
```

## Views for Row-Level Security

Restrict which rows different users can see:

```sql
-- Create a view that shows only the current user's data
CREATE VIEW my_orders AS
SELECT * FROM orders
WHERE owner_user = CURRENT_USER();

-- Grant SELECT on the view but not the underlying table
GRANT SELECT ON mydb.my_orders TO 'app_user'@'%';
```

## Listing and Dropping Views

```sql
-- List all views in current database
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- View the definition
SHOW CREATE VIEW active_customers;

-- Drop a view
DROP VIEW IF EXISTS active_customers;
```

## OR REPLACE and ALTER VIEW

```sql
-- Replace an existing view definition
CREATE OR REPLACE VIEW active_customers AS
SELECT id, name, email FROM customers
WHERE status = 'active' AND verified = 1;

-- Alter a view (requires the view to already exist, unlike CREATE OR REPLACE)
ALTER VIEW active_customers AS
SELECT id, name, email, phone FROM customers
WHERE status = 'active';
```

## Summary

Views in MySQL provide named, reusable query abstractions that act like virtual tables. They simplify complex queries, enforce data security by limiting visible rows and columns, and decouple application queries from underlying table structures. Simple views are updatable, and `WITH CHECK OPTION` enforces constraint integrity on updates through views. Views are a fundamental tool for building clean database interfaces.
