# MySQL Views vs Derived Tables: Performance Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Query Optimization

Description: Compare MySQL views and derived tables on performance, query planning, reusability, and when each approach produces better execution plans.

---

Both views and derived tables let you nest a subquery inside a larger query. However, they behave differently in how MySQL's optimizer handles them, which has meaningful performance implications.

## What is a Derived Table

A derived table is an inline subquery in the `FROM` clause. It is defined and used in the same query.

```sql
-- Derived table: subquery in FROM clause
SELECT d.department, d.avg_salary
FROM (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS d
WHERE d.avg_salary > 60000;
```

Because this derived table contains `GROUP BY` and an aggregate function, the optimizer must materialize it into a temporary table. For simpler derived tables without these constructs, the optimizer can merge them into the outer query, allowing direct index access on base tables.

## What is a View

A view is a named, stored query that can be reused across multiple statements.

```sql
-- Create a reusable view
CREATE VIEW dept_avg_salary AS
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;

-- Use the view
SELECT * FROM dept_avg_salary WHERE avg_salary > 60000;
```

The view stores the query definition, not the results. It is re-executed each time it is queried.

## Optimizer Behavior: Merging vs Materialization

MySQL's optimizer can handle derived tables and views in two ways:
- **Merge**: fold the subquery into the outer query, allowing index usage on base tables
- **Materialize**: execute the subquery into a temporary table first, then query the temporary table

Merging is generally faster because the optimizer can push conditions down to base tables. Materialization creates a temporary table that lacks the base table indexes, which can be slower. However, MySQL may add an auto-generated index to a materialized derived table to speed up subsequent joins.

```sql
EXPLAIN SELECT d.department, d.avg_salary
FROM (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS d
WHERE d.avg_salary > 60000;
-- EXTRA: Using temporary (materialization forced by GROUP BY in subquery)
```

Views with aggregate functions, `DISTINCT`, `GROUP BY`, or `UNION` are always materialized - MySQL cannot merge them. Simple views without these constructs are often merged.

```sql
-- Simple view - can be merged (optimizer sees base table)
CREATE VIEW active_users AS
SELECT id, email, name FROM users WHERE active = 1;

EXPLAIN SELECT * FROM active_users WHERE id = 42;
-- Optimizer accesses users table directly using primary key - merged
```

## Performance Tips

Avoid nesting views inside views. Each level of nesting increases the chance of forced materialization.

```sql
-- Anti-pattern: view on top of view
CREATE VIEW vw_top_customers AS
SELECT * FROM customer_summary WHERE order_count > 10;
-- If customer_summary is also a view with GROUP BY, all layers materialize
```

Use derived tables when the query is complex and one-off. Use views for reusability and clarity without expecting them to be faster than equivalent derived tables.

```sql
-- Force materialization with NO_MERGE hint (MySQL 8.0)
SELECT /*+ NO_MERGE(d) */ d.department, d.avg_salary
FROM (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS d;
```

## Updatable Views

Simple views (no GROUP BY, DISTINCT, UNION, or subqueries) are updatable, meaning you can INSERT, UPDATE, and DELETE through them.

```sql
UPDATE active_users SET name = 'Alice B.' WHERE id = 5;
-- This updates the underlying users table
```

Derived tables are never updatable.

## Summary

Derived tables and views produce the same results but differ in reuse and optimization. Simple views are often merged into the outer query by MySQL's optimizer, giving the same performance as the equivalent direct query. Views with aggregations, GROUP BY, or DISTINCT are materialized into temporary tables. Use derived tables for complex one-time queries, and views for query reuse and simplifying application code - but always verify the execution plan with EXPLAIN when performance matters.
