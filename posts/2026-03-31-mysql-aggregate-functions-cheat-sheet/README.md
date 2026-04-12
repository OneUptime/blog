# MySQL Aggregate Functions Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Aggregate Function, Query, Cheat Sheet

Description: Quick reference for MySQL aggregate functions including COUNT, SUM, AVG, MIN, MAX, GROUP_CONCAT, and statistical aggregates with GROUP BY and HAVING examples.

---

## Core Aggregate Functions

```sql
SELECT
  COUNT(*)            AS total_rows,
  COUNT(email)        AS rows_with_email,   -- NULLs excluded
  COUNT(DISTINCT dept_id) AS unique_depts,
  SUM(salary)         AS total_payroll,
  AVG(salary)         AS avg_salary,
  MIN(salary)         AS lowest_salary,
  MAX(salary)         AS highest_salary
FROM employees;
```

## COUNT Variations

```sql
-- Count all rows including NULLs
SELECT COUNT(*) FROM orders;

-- Count non-NULL values in a column
SELECT COUNT(shipped_at) FROM orders;

-- Count distinct values
SELECT COUNT(DISTINCT customer_id) FROM orders;
```

## SUM and AVG

```sql
-- Total revenue per product
SELECT product_id,
       SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id;

-- Average order value by status
SELECT status, AVG(total) AS avg_order
FROM orders
GROUP BY status;
```

## MIN and MAX

```sql
-- Oldest and newest order per customer
SELECT customer_id,
       MIN(created_at) AS first_order,
       MAX(created_at) AS last_order
FROM orders
GROUP BY customer_id;
```

## GROUP_CONCAT

Aggregates values from multiple rows into a single string.

```sql
-- Comma-separated list of product names per order
SELECT order_id,
       GROUP_CONCAT(product_name ORDER BY product_name SEPARATOR ', ') AS products
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY order_id;

-- Limit length (default 1024 bytes)
SET SESSION group_concat_max_len = 10000;
```

## Statistical Functions

```sql
SELECT
  STD(salary)    AS std_dev,
  STDDEV(salary) AS std_dev_alias,
  VARIANCE(salary) AS variance
FROM employees;
```

## BIT Aggregates

```sql
SELECT
  BIT_AND(flags) AS common_flags,
  BIT_OR(flags)  AS any_flag,
  BIT_XOR(flags) AS xor_flags
FROM permissions;
```

## GROUP BY with HAVING

HAVING filters groups after aggregation (WHERE filters rows before).

```sql
-- Departments with more than 5 employees and average salary above 70k
SELECT dept_id,
       COUNT(*)     AS headcount,
       AVG(salary)  AS avg_salary
FROM employees
GROUP BY dept_id
HAVING COUNT(*) > 5
   AND AVG(salary) > 70000;
```

## Grouping by Multiple Columns

```sql
SELECT dept_id, job_title, COUNT(*) AS headcount
FROM employees
GROUP BY dept_id, job_title
ORDER BY dept_id, headcount DESC;
```

## ROLLUP (subtotals and grand total)

```sql
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY dept_id, job_title WITH ROLLUP;
-- NULL rows represent subtotals and grand total
```

## Aggregate with CASE

```sql
-- Count approved vs rejected applications
SELECT
  COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected
FROM applications;
```

## Filtering Before Aggregation (WHERE vs HAVING)

```sql
-- WHERE applies first (index-friendly)
SELECT dept_id, AVG(salary)
FROM employees
WHERE hire_date >= '2020-01-01'   -- filter rows first
GROUP BY dept_id
HAVING AVG(salary) > 60000;       -- then filter groups
```

## Summary

MySQL aggregate functions collapse multiple rows into summary values. COUNT(*) counts rows; COUNT(col) skips NULLs; SUM and AVG work on numeric columns; MIN and MAX work on numeric, date, and string columns. GROUP_CONCAT is unique to MySQL and builds delimited lists. Use HAVING to filter after aggregation, and WITH ROLLUP to add subtotals without a second query.
