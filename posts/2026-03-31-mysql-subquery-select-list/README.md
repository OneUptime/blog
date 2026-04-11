# How to Use Subqueries in the SELECT List in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Subquery, Database, Query

Description: Learn how to write scalar subqueries in the MySQL SELECT list to compute per-row values like totals, counts, and lookups without joining to additional tables.

---

A subquery in the `SELECT` list computes a value for each row returned by the outer query. Because it must return exactly one row and one column, it is always a scalar subquery. This pattern is useful for adding computed columns that depend on related data.

## Syntax

```sql
SELECT
    col1,
    col2,
    (SELECT aggregate_or_scalar FROM other_table WHERE other_table.fk = outer_table.pk) AS computed_col
FROM outer_table;
```

## Basic example: count related rows

```sql
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100)
);

CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    total       DECIMAL(10,2)
);

SELECT
    c.customer_id,
    c.name,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count
FROM customers c;
```

For each customer row, MySQL evaluates the inner `COUNT(*)` query using that customer's `customer_id`.

## Lookup a related value

```sql
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    name          VARCHAR(60)
);

CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    name          VARCHAR(100),
    department_id INT,
    salary        DECIMAL(10,2)
);

-- Show each employee with their department name
SELECT
    e.employee_id,
    e.name,
    (SELECT d.name FROM departments d WHERE d.department_id = e.department_id) AS department
FROM employees e;
```

This is equivalent to a `LEFT JOIN` on a unique key. If the subquery matches more than one row, MySQL raises error 1242 (`Subquery returns more than 1 row`), so the correlated condition must match at most one row.

## Aggregate comparison per row

```sql
-- Show each employee with the average salary in their department
SELECT
    e.name,
    e.salary,
    (
        SELECT ROUND(AVG(e2.salary), 2)
        FROM employees e2
        WHERE e2.department_id = e.department_id
    ) AS dept_avg,
    e.salary - (
        SELECT AVG(e2.salary)
        FROM employees e2
        WHERE e2.department_id = e.department_id
    ) AS diff_from_avg
FROM employees e;
```

## Using an alias from SELECT in ORDER BY

Aliases defined in the `SELECT` list can be used in `ORDER BY` and, as a MySQL extension, in `HAVING`, but not in `WHERE`:

```sql
SELECT
    c.name,
    (SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.customer_id) AS total_spent
FROM customers c
ORDER BY total_spent DESC;
```

## Returning NULL when no related row exists

If the subquery finds no matching row, it returns `NULL`:

```sql
SELECT
    c.name,
    (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.customer_id) AS last_order_date
FROM customers c;
-- Customers with no orders get NULL in last_order_date
```

Use `COALESCE` to replace `NULL` with a default:

```sql
SELECT
    c.name,
    COALESCE(
        (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.customer_id),
        'No orders'
    ) AS last_order_date
FROM customers c;
```

## LIMIT 1 as a safety guard

If there is any chance the inner query could return more than one row, add `LIMIT 1`:

```sql
SELECT
    e.name,
    (
        SELECT p.project_name
        FROM project_assignments pa
        INNER JOIN projects p ON pa.project_id = p.project_id
        WHERE pa.employee_id = e.employee_id
        ORDER BY pa.assigned_date DESC
        LIMIT 1
    ) AS latest_project
FROM employees e;
```

## Performance: SELECT list subquery vs JOIN

A SELECT-list subquery that is correlated runs once for every outer row. For large result sets, this can be slower than the equivalent `JOIN`:

```sql
-- Subquery form (may run N times for N employees)
SELECT
    e.name,
    (SELECT d.name FROM departments d WHERE d.department_id = e.department_id) AS dept
FROM employees e;

-- JOIN form (usually faster for large tables)
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;
```

For aggregate lookups that cannot easily be expressed as a simple join, the subquery form is often the clearest option. Check `EXPLAIN` to confirm performance is acceptable.

## Multiple subqueries in SELECT

```sql
SELECT
    c.name,
    (SELECT COUNT(*)       FROM orders o WHERE o.customer_id = c.customer_id) AS order_count,
    (SELECT SUM(o.total)   FROM orders o WHERE o.customer_id = c.customer_id) AS total_spent,
    (SELECT MAX(o.total)   FROM orders o WHERE o.customer_id = c.customer_id) AS max_order
FROM customers c;
```

When you need multiple aggregates from the same related table, a single `LEFT JOIN` + `GROUP BY` approach is usually more efficient.

## Summary

Subqueries in the `SELECT` list compute a scalar value for each outer row. They are useful for per-row lookups, counts, and aggregates from related tables. For simple lookups, a `LEFT JOIN` is usually faster. Use `LIMIT 1` to guard against unexpected multiple-row returns, and consider rewriting multiple SELECT-list subqueries as a single join when performance matters.
