# How to Convert Subqueries to CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, Subquery, SQL, Readability

Description: Learn how to refactor complex nested subqueries into readable, maintainable CTEs in MySQL 8, with before-and-after examples for common patterns.

---

## Why Convert Subqueries to CTEs?

Subqueries in MySQL are powerful but can become hard to read when nested multiple levels deep or repeated in a query. CTEs (Common Table Expressions) give the subquery a name, move it to the top of the query, and allow it to be referenced like a table. The logic does not change - only the presentation improves.

Benefits include:
- Each step has a descriptive name
- Repeated subquery logic is written once
- Debugging is easier because each CTE can be tested independently
- The final `SELECT` reads like a short summary

## Pattern 1: Inline Subquery in FROM

Before (derived table):

```sql
SELECT dept.department_id, dept.avg_sal, e.full_name
FROM (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department_id
) AS dept
JOIN employees e ON e.department_id = dept.department_id
WHERE e.salary > dept.avg_sal;
```

After (CTE):

```sql
WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department_id
)
SELECT d.department_id, d.avg_sal, e.full_name
FROM dept_avg d
JOIN employees e ON e.department_id = d.department_id
WHERE e.salary > d.avg_sal;
```

## Pattern 2: Repeated Subquery

Before (same subquery written twice):

```sql
SELECT o.order_id, o.customer_id, o.total,
  (SELECT AVG(total) FROM orders) AS overall_avg,
  o.total - (SELECT AVG(total) FROM orders) AS variance
FROM orders o;
```

After (CTE computed once):

```sql
WITH order_avg AS (
  SELECT AVG(total) AS overall_avg FROM orders
)
SELECT o.order_id, o.customer_id, o.total,
  oa.overall_avg,
  o.total - oa.overall_avg AS variance
FROM orders o
CROSS JOIN order_avg oa;
```

## Pattern 3: Nested Subqueries

Before (three levels deep):

```sql
SELECT customer_id, total_revenue
FROM (
  SELECT customer_id, SUM(order_total) AS total_revenue
  FROM (
    SELECT o.customer_id, o.order_id,
           SUM(oi.quantity * oi.unit_price) AS order_total
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY o.customer_id, o.order_id
  ) AS completed_orders
  GROUP BY customer_id
) AS customer_totals
WHERE total_revenue > 1000;
```

After (two named CTEs):

```sql
WITH
  completed_orders AS (
    SELECT o.customer_id, o.order_id,
           SUM(oi.quantity * oi.unit_price) AS order_total
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = 'completed'
    GROUP BY o.customer_id, o.order_id
  ),
  customer_totals AS (
    SELECT customer_id, SUM(order_total) AS total_revenue
    FROM completed_orders
    GROUP BY customer_id
  )
SELECT customer_id, total_revenue
FROM customer_totals
WHERE total_revenue > 1000;
```

## Pattern 4: Correlated Subquery to CTE + JOIN

Before (correlated, runs once per row):

```sql
SELECT e.employee_id, e.full_name, e.salary,
  (SELECT AVG(salary) FROM employees e2
   WHERE e2.department_id = e.department_id) AS dept_avg
FROM employees e;
```

After (CTE + join, computes averages once):

```sql
WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department_id
)
SELECT e.employee_id, e.full_name, e.salary, da.avg_sal AS dept_avg
FROM employees e
JOIN dept_avg da ON e.department_id = da.department_id;
```

This version typically performs better because the aggregation runs once.

## Performance Note

MySQL's optimizer can sometimes inline a CTE back into the query, so performance is not always different. Use `EXPLAIN` to compare execution plans. The primary benefit of CTEs over subqueries is readability and maintainability, not necessarily raw performance.

```sql
EXPLAIN
WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees GROUP BY department_id
)
SELECT e.*, da.avg_sal
FROM employees e JOIN dept_avg da ON e.department_id = da.department_id;
```

## Summary

Converting subqueries to CTEs in MySQL 8 is a readability improvement that pays dividends in complex queries. Extract inline derived tables, move repeated subqueries to a single named CTE, and unravel deeply nested logic into sequential named steps. The query plan often stays the same, but the SQL becomes much easier to understand and maintain.
