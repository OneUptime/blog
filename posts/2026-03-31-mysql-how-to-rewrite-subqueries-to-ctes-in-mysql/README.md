# How to Rewrite Subqueries to CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, Common Table Expression, Subqueries, Query Optimization

Description: Learn how to rewrite complex MySQL subqueries as Common Table Expressions (CTEs) to improve readability, maintainability, and in some cases performance.

---

## What Are CTEs in MySQL?

Common Table Expressions (CTEs) were introduced in MySQL 8.0. A CTE is a named temporary result set defined with the `WITH` clause at the beginning of a query. It can be referenced multiple times in the same query, making complex queries much more readable than nested subqueries.

CTEs come in two forms: non-recursive (standard) and recursive. This guide focuses on rewriting subqueries to non-recursive CTEs.

## Basic CTE Syntax

```sql
WITH cte_name AS (
  SELECT ...
)
SELECT * FROM cte_name;
```

Multiple CTEs can be chained:

```sql
WITH
  cte1 AS (SELECT ...),
  cte2 AS (SELECT ... FROM cte1)
SELECT * FROM cte2;
```

## Rewriting a Simple Subquery

A subquery in the FROM clause (derived table) is the most direct candidate for a CTE rewrite.

```sql
-- Before: nested derived table
SELECT dept, avg_salary
FROM (
  SELECT department AS dept, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS dept_avg
WHERE avg_salary > 70000;

-- After: CTE
WITH dept_avg AS (
  SELECT department AS dept, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
)
SELECT dept, avg_salary
FROM dept_avg
WHERE avg_salary > 70000;
```

The CTE version is easier to read and separates the aggregation logic from the filter.

## Rewriting Multiple Levels of Nesting

Deep nesting in subqueries is hard to read and debug. CTEs flatten the structure.

```sql
-- Before: three levels of nesting
SELECT customer_id, name, total_spent
FROM (
  SELECT c.customer_id, c.name, SUM(o.total_amount) AS total_spent
  FROM customers c
  JOIN (
    SELECT order_id, customer_id, total_amount
    FROM orders
    WHERE status = 'completed'
  ) AS completed_orders ON c.customer_id = completed_orders.customer_id
  GROUP BY c.customer_id, c.name
) AS customer_totals
WHERE total_spent > 1000
ORDER BY total_spent DESC;

-- After: two CTEs
WITH
  completed_orders AS (
    SELECT order_id, customer_id, total_amount
    FROM orders
    WHERE status = 'completed'
  ),
  customer_totals AS (
    SELECT c.customer_id, c.name, SUM(co.total_amount) AS total_spent
    FROM customers c
    JOIN completed_orders co ON c.customer_id = co.customer_id
    GROUP BY c.customer_id, c.name
  )
SELECT customer_id, name, total_spent
FROM customer_totals
WHERE total_spent > 1000
ORDER BY total_spent DESC;
```

## Reusing a CTE Multiple Times

One key advantage of CTEs over subqueries is that they can be referenced multiple times within the same query. A subquery would need to be duplicated.

```sql
-- Without CTE: the subquery runs twice
SELECT *
FROM orders o
WHERE total_amount > (SELECT AVG(total_amount) FROM orders)
  AND total_amount < (SELECT AVG(total_amount) FROM orders) * 2;

-- With CTE: computed once, referenced twice
WITH order_stats AS (
  SELECT AVG(total_amount) AS avg_amount
  FROM orders
)
SELECT *
FROM orders o, order_stats s
WHERE o.total_amount > s.avg_amount
  AND o.total_amount < s.avg_amount * 2;
```

## CTEs for Debugging Step by Step

CTEs are excellent for incremental query development. You can run each CTE independently to verify intermediate results.

```sql
-- Step 1: verify the CTE in isolation
WITH active_customers AS (
  SELECT customer_id, name
  FROM customers
  WHERE status = 'active' AND created_at < '2024-01-01'
)
SELECT * FROM active_customers LIMIT 10;

-- Step 2: build on it
WITH
  active_customers AS (
    SELECT customer_id, name
    FROM customers
    WHERE status = 'active' AND created_at < '2024-01-01'
  ),
  their_orders AS (
    SELECT o.customer_id, COUNT(*) AS order_count
    FROM orders o
    JOIN active_customers ac ON o.customer_id = ac.customer_id
    GROUP BY o.customer_id
  )
SELECT ac.name, COALESCE(to2.order_count, 0) AS order_count
FROM active_customers ac
LEFT JOIN their_orders to2 ON ac.customer_id = to2.customer_id;
```

## CTE vs Subquery: Performance Considerations

In MySQL 8.0, non-recursive CTEs are not materialized by default - the optimizer can inline them like a derived table. However, MySQL may choose to materialize a CTE if it determines that is more efficient. You can use the `EXPLAIN` output to see whether a CTE is materialized.

```sql
EXPLAIN FORMAT=JSON
WITH dept_avg AS (
  SELECT department, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
)
SELECT * FROM dept_avg WHERE avg_salary > 70000;
```

Look for `"materialized_from_subquery"` in the JSON output to see if MySQL chose to materialize the CTE. If the CTE was merged (inlined), its underlying tables appear directly in the query plan without a separate materialization entry.

## When to Use a CTE vs a Subquery

Use a CTE when:
- The subquery is referenced more than once.
- The query has multiple levels of nesting that hurt readability.
- You want to build the query incrementally for debugging.

A subquery may still be appropriate for simple, single-use cases where CTE overhead is not necessary.

## Summary

CTEs in MySQL 8.0 provide a clean way to name and reuse intermediate result sets, replacing deeply nested derived table subqueries with readable, step-by-step query logic. They are especially valuable when the same subquery needs to be referenced multiple times or when complex multi-step logic needs to be clearly expressed. Use `EXPLAIN FORMAT=JSON` to understand whether MySQL materializes your CTEs and adjust accordingly.
