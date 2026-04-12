# How to Use Derived Tables Effectively in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Derived Table, SQL, Subqueries, Performance

Description: Learn how to use derived tables in MySQL for complex aggregations, multi-step filtering, and pre-aggregated joins, and when to prefer CTEs instead.

---

## What Are Derived Tables

A derived table is a subquery used in the `FROM` clause that acts as a temporary result set. Unlike a regular subquery in `WHERE`, a derived table can be joined, filtered, and aggregated like any real table.

```sql
SELECT d.department, d.avg_salary
FROM (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) d
WHERE d.avg_salary > 50000;
```

The inner `SELECT ... GROUP BY` is the derived table aliased as `d`.

## Why Use Derived Tables

1. Break complex queries into logical steps
2. Pre-aggregate before joining (reduces join size)
3. Apply `HAVING` equivalents via `WHERE` on outer query
4. Avoid window function limitations in `WHERE` clauses

## Basic Example: Filter After Aggregation

Without a derived table, you cannot use a column alias in the same `SELECT` level's `WHERE`:

```sql
-- This works with a derived table
SELECT dept, total_sales
FROM (
  SELECT department AS dept, SUM(sales) AS total_sales
  FROM sales_data
  GROUP BY department
) agg
WHERE total_sales > 100000
ORDER BY total_sales DESC;
```

## Pre-Aggregation Before JOIN

Derived tables shine when you need to aggregate before joining to avoid row multiplication:

```sql
-- Without derived table: JOIN multiplies rows then GROUP BY
-- With derived table: aggregate first, then join

SELECT
  c.customer_name,
  o.total_orders,
  o.total_spent
FROM customers c
INNER JOIN (
  SELECT
    customer_id,
    COUNT(*)       AS total_orders,
    SUM(total)     AS total_spent
  FROM orders
  WHERE created_at >= '2026-01-01'
  GROUP BY customer_id
) o ON o.customer_id = c.id
WHERE o.total_orders >= 5
ORDER BY o.total_spent DESC;
```

## Multi-Step Transformation

Use multiple derived tables for multi-step calculations:

```sql
SELECT
  category,
  avg_price,
  CASE
    WHEN avg_price >= high_threshold THEN 'Premium'
    WHEN avg_price >= mid_threshold  THEN 'Mid-Range'
    ELSE 'Budget'
  END AS price_tier
FROM (
  SELECT
    category,
    AVG(price) AS avg_price
  FROM products
  GROUP BY category
) category_avgs
CROSS JOIN (
  SELECT
    AVG(price) + STDDEV(price) AS high_threshold,
    AVG(price)                 AS mid_threshold
  FROM products
) thresholds;
```

## Derived Table vs CTE

In MySQL 8.0, CTEs (`WITH` clause) are often cleaner than nested derived tables:

```sql
-- Nested derived table (hard to read)
SELECT *
FROM (
  SELECT department, AVG(salary) AS avg_salary
  FROM (
    SELECT * FROM employees WHERE active = 1
  ) active_emps
  GROUP BY department
) dept_avgs
WHERE avg_salary > 50000;

-- Equivalent CTE (cleaner)
WITH active_emps AS (
  SELECT * FROM employees WHERE active = 1
),
dept_avgs AS (
  SELECT department, AVG(salary) AS avg_salary
  FROM active_emps
  GROUP BY department
)
SELECT * FROM dept_avgs WHERE avg_salary > 50000;
```

Use CTEs for readability when you have more than one derived table level.

## Derived Tables in UPDATE and DELETE

Derived tables can be used in `UPDATE` and `DELETE` statements:

```sql
-- Update based on aggregated data
UPDATE products p
INNER JOIN (
  SELECT category, AVG(price) AS avg_price
  FROM products
  GROUP BY category
) avg_prices ON avg_prices.category = p.category
SET p.price_tier = CASE
  WHEN p.price > avg_prices.avg_price * 1.5 THEN 'Premium'
  WHEN p.price < avg_prices.avg_price * 0.5 THEN 'Budget'
  ELSE 'Standard'
END;
```

## Performance Considerations

```sql
EXPLAIN SELECT d.dept, d.cnt
FROM (
  SELECT department AS dept, COUNT(*) AS cnt
  FROM employees
  GROUP BY department
) d
WHERE d.cnt > 5;
```

In MySQL 8.0, the optimizer can push `WHERE` conditions into the derived table (condition pushdown optimization), effectively converting the above to:

```sql
SELECT department AS dept, COUNT(*) AS cnt
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;
```

Check if pushdown occurred:

```sql
EXPLAIN FORMAT=JSON SELECT ...;
-- Look for "pushed_down_conds" in the output
```

## Summary

Derived tables are effective for pre-aggregating data before joins, applying filters on aggregate results, and structuring complex multi-step transformations. In MySQL 8.0, the optimizer often pushes outer `WHERE` filters into derived tables automatically. For multi-level nesting, prefer CTEs for readability while achieving the same result.
