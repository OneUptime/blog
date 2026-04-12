# How to Use Window Functions in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Analytics, SQL

Description: Learn how to use window functions in MySQL 8 to perform rankings, running totals, and moving averages without collapsing result rows.

---

## What Are Window Functions

Window functions compute a result for each row based on a set of rows related to that row - called the "window" - without collapsing the result set like aggregate functions do. They use an `OVER()` clause to define the window.

MySQL 8 supports a full set of window functions including ranking, value, and aggregate functions used as window functions.

## Basic Syntax

```sql
function_name(expression) OVER (
  [PARTITION BY column_list]
  [ORDER BY column_list]
  [ROWS or RANGE frame_clause]
)
```

## ROW_NUMBER - Assign Sequential Numbers

```sql
SELECT
  employee_id,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

Each department gets its own numbering sequence starting from 1.

## RANK and DENSE_RANK - Handle Ties Differently

```sql
SELECT
  employee_id,
  department,
  salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_with_gaps,
  DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_no_gaps
FROM employees;
```

- `RANK()` skips numbers after ties (1, 1, 3).
- `DENSE_RANK()` does not skip (1, 1, 2).

## Running Total with SUM OVER

```sql
SELECT
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM daily_sales
ORDER BY order_date;
```

## Moving Average with AVG OVER

```sql
SELECT
  sale_date,
  revenue,
  AVG(revenue) OVER (
    ORDER BY sale_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7_days
FROM sales;
```

## LAG and LEAD - Access Previous and Next Rows

```sql
SELECT
  sale_date,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY sale_date) AS prev_day_revenue,
  LEAD(revenue, 1) OVER (ORDER BY sale_date) AS next_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY sale_date) AS day_over_day_change
FROM daily_sales
ORDER BY sale_date;
```

## FIRST_VALUE and LAST_VALUE

```sql
SELECT
  department,
  employee_id,
  salary,
  FIRST_VALUE(salary) OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS highest_salary_in_dept
FROM employees;
```

## NTILE - Divide Rows into Buckets

```sql
SELECT
  employee_id,
  salary,
  NTILE(4) OVER (ORDER BY salary) AS salary_quartile
FROM employees;
```

## PERCENT_RANK and CUME_DIST

```sql
SELECT
  employee_id,
  salary,
  PERCENT_RANK() OVER (ORDER BY salary) AS pct_rank,
  CUME_DIST() OVER (ORDER BY salary) AS cumulative_dist
FROM employees;
```

## Named Windows with WINDOW Clause

When using the same window definition multiple times, define it once with `WINDOW`:

```sql
SELECT
  department,
  employee_id,
  salary,
  RANK() OVER dept_window AS dept_rank,
  SUM(salary) OVER dept_window AS dept_running_salary
FROM employees
WINDOW dept_window AS (PARTITION BY department ORDER BY salary DESC);
```

## Practical Example - Top 3 Products Per Category

```sql
WITH ranked_products AS (
  SELECT
    category,
    product_name,
    total_sales,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY total_sales DESC) AS sales_rank
  FROM product_sales
)
SELECT category, product_name, total_sales
FROM ranked_products
WHERE sales_rank <= 3
ORDER BY category, sales_rank;
```

## Summary

MySQL 8 window functions are a powerful addition for analytical queries, enabling rankings, running aggregates, lag/lead comparisons, and percentile calculations without complex self-joins or subqueries. By combining `PARTITION BY` and `ORDER BY` within the `OVER()` clause, you can express sophisticated analytics concisely and efficiently.
