# How to Use Named Windows with the WINDOW Clause in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, SQL, Query, Performance

Description: Learn how to define reusable named windows with the WINDOW clause in MySQL 8 to simplify queries that apply the same window specification multiple times.

---

## What Is a Named Window?

When you write multiple window functions in a single `SELECT` statement, you often repeat the same `OVER (PARTITION BY ... ORDER BY ...)` specification. MySQL 8.0 introduced the `WINDOW` clause to let you define a window once, give it a name, and reference that name in multiple `OVER` clauses.

This reduces repetition, improves readability, and makes it easier to change window definitions in one place.

## Syntax

```sql
SELECT
  col1,
  FUNC1() OVER w AS alias1,
  FUNC2() OVER w AS alias2
FROM table_name
WINDOW w AS (PARTITION BY col2 ORDER BY col3);
```

The `WINDOW` clause appears after `WHERE`, `GROUP BY`, and `HAVING` but before `ORDER BY` and `LIMIT`.

## Basic Example

Without a named window:

```sql
SELECT
  employee_id,
  department_id,
  salary,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_rank,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_dense_rank,
  PERCENT_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_pct_rank
FROM employees;
```

The same query with a named window:

```sql
SELECT
  employee_id,
  department_id,
  salary,
  RANK() OVER w AS dept_rank,
  DENSE_RANK() OVER w AS dept_dense_rank,
  PERCENT_RANK() OVER w AS dept_pct_rank
FROM employees
WINDOW w AS (PARTITION BY department_id ORDER BY salary DESC);
```

The second version is shorter and easier to maintain.

## Defining Multiple Named Windows

You can define several named windows separated by commas:

```sql
SELECT
  sale_id,
  region,
  salesperson_id,
  amount,
  SUM(amount) OVER region_window AS region_total,
  RANK() OVER sales_window AS sales_rank
FROM sales
WINDOW
  region_window AS (PARTITION BY region),
  sales_window AS (PARTITION BY region ORDER BY amount DESC);
```

## Extending a Named Window

A named window can inherit from another window and add an `ORDER BY` or frame clause. This is called a window extension:

```sql
SELECT
  order_id,
  order_date,
  amount,
  SUM(amount) OVER (w ORDER BY order_date) AS running_total,
  AVG(amount) OVER (w ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7
FROM orders
WINDOW w AS (PARTITION BY customer_id);
```

Here `w` defines only the partition; each usage adds its own `ORDER BY` and optional frame on top.

## Rules for Window Extension

- A window referenced in `OVER` can add an `ORDER BY` only if the named window does not already have one.
- A window referenced in `OVER` can add a frame clause only if the named window does not already have one.
- You cannot change the `PARTITION BY` in a window extension.

```sql
-- Valid: named window has no ORDER BY, reference adds one
WINDOW base_w AS (PARTITION BY dept_id)
-- usage: OVER (base_w ORDER BY salary)

-- Invalid: named window already has ORDER BY, cannot add another
WINDOW full_w AS (PARTITION BY dept_id ORDER BY salary)
-- usage: OVER (full_w ORDER BY hire_date)  -- ERROR
```

## Practical Use Case - Sales Dashboard Metrics

```sql
SELECT
  s.sale_date,
  s.region,
  s.amount,
  SUM(s.amount)    OVER w AS running_total,
  AVG(s.amount)    OVER w AS running_avg,
  COUNT(*)         OVER w AS running_count,
  MAX(s.amount)    OVER w AS running_max,
  MIN(s.amount)    OVER w AS running_min
FROM sales s
WINDOW w AS (PARTITION BY region ORDER BY sale_date);
```

One window definition powers five different aggregates.

## Summary

The `WINDOW` clause in MySQL 8 allows you to name and reuse window specifications across multiple window functions in the same query. This eliminates repetitive `OVER` clauses, centralizes window definitions for easy maintenance, and makes complex analytical SQL easier to read and understand.
