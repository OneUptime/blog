# How to Use Views with JOINs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Join, SQL, Database Administration

Description: Learn how to create MySQL views that encapsulate multi-table JOINs, when join views are updatable, and how to optimize their performance.

---

## Creating a View with an INNER JOIN

The most common use case is wrapping a JOIN between two or more tables into a reusable named view:

```sql
CREATE VIEW employee_details AS
SELECT
  e.id,
  e.name,
  e.hire_date,
  d.department_name,
  d.location
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

Querying the view is then identical to querying a table:

```sql
SELECT name, department_name
FROM employee_details
WHERE location = 'New York';
```

## LEFT JOIN View for Optional Relationships

Capture employees with or without a manager:

```sql
CREATE VIEW employee_manager AS
SELECT
  e.id            AS employee_id,
  e.name          AS employee_name,
  m.name          AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

Rows where `manager_id` is NULL appear with `manager_name` as NULL rather than being excluded.

## Four-Table JOIN View

```sql
CREATE VIEW order_line_details AS
SELECT
  o.id          AS order_id,
  c.name        AS customer_name,
  p.product_name,
  oi.qty,
  oi.unit_price,
  (oi.qty * oi.unit_price) AS line_total
FROM orders o
JOIN customers c    ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id   = o.id
JOIN products p     ON oi.product_id = p.id;
```

## Updatability of JOIN Views

A JOIN view can be updatable if at least one of the joined tables is "key-preserved" - meaning each row in that table appears at most once in the view result. Only columns from key-preserved tables can be updated through the view:

```sql
-- Update allowed for employees columns only (key-preserved side)
UPDATE employee_details
SET hire_date = '2024-01-15'
WHERE id = 101;

-- Update of the non-key-preserved side raises an error
UPDATE employee_details
SET department_name = 'Finance'
WHERE id = 101;
-- ERROR 1288 (HY000): The target table 'employee_details' of the UPDATE is not updatable
```

## Checking if a JOIN View is Updatable

```sql
SELECT TABLE_NAME, IS_UPDATABLE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employee_details';
```

## Optimizing JOIN View Performance

Ensure the join columns are indexed on the base tables:

```sql
-- Index on employees side
CREATE INDEX idx_employees_dept ON employees(dept_id);

-- Index on departments side (usually already the primary key)
-- No separate index needed if dept.id is the PK
```

Use EXPLAIN to confirm index usage:

```sql
EXPLAIN SELECT * FROM employee_details WHERE location = 'New York';
```

If the ALGORITHM is MERGE, the optimizer can apply the `location = 'New York'` predicate directly to the `departments` table and use any index on `departments(location)`.

```sql
CREATE INDEX idx_departments_location ON departments(location);
```

## Summary

MySQL views with JOINs are powerful tools for abstracting multi-table relationships into clean, reusable objects. For simple INNER or LEFT JOIN views where one side is key-preserved, the view can be updatable for that table's columns. Always index JOIN columns and the columns used in WHERE clauses against the view to ensure the optimizer can apply MERGE and use base table indexes efficiently.
