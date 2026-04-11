# What Is a Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Analytics, SQL, Ranking

Description: A window function in MySQL performs calculations across a set of related rows without collapsing them into a single row, enabling rankings, running totals, and moving averages.

---

## Overview

A window function operates over a "window" of rows related to the current row, performing calculations like ranking, cumulative sums, or moving averages while preserving all rows in the result set. Unlike aggregate functions with `GROUP BY` (which collapse rows into summaries), window functions keep each row intact and add a computed column based on the defined window. MySQL 8.0 introduced full window function support.

## Basic Syntax

```sql
function_name() OVER (
  [PARTITION BY partition_columns]
  [ORDER BY sort_columns]
  [frame_clause]
)
```

- `PARTITION BY`: Divides rows into groups (like GROUP BY, but rows are not collapsed).
- `ORDER BY`: Defines the sort order within each partition for ordered functions.
- `frame_clause`: Defines which rows within the partition contribute to the calculation.

## Ranking Functions

```sql
SELECT
  name,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
  RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank_val,
  DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank_val
FROM employees;
```

- `ROW_NUMBER()`: Unique sequential number, no ties.
- `RANK()`: Same rank for ties, gaps in numbering after ties.
- `DENSE_RANK()`: Same rank for ties, no gaps.

## Running Totals and Cumulative Sums

```sql
SELECT
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date) AS running_total,
  AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7day_avg
FROM daily_revenue
ORDER BY order_date;
```

## LAG and LEAD

Access values from previous or following rows without a self-join:

```sql
SELECT
  month,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY month) AS prev_month_revenue,
  LEAD(revenue, 1) OVER (ORDER BY month) AS next_month_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY month) AS month_over_month_change
FROM monthly_sales;
```

## FIRST_VALUE and LAST_VALUE

```sql
SELECT
  employee_id,
  department,
  salary,
  FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS top_salary_in_dept,
  LAST_VALUE(salary) OVER (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_salary_in_dept
FROM employees;
```

## NTILE

Divide rows into N equal buckets:

```sql
SELECT
  customer_id,
  total_spent,
  NTILE(4) OVER (ORDER BY total_spent DESC) AS quartile
FROM customer_summary;
-- Quartile 1 = top 25% spenders
```

## Named Windows

Reuse window definitions with a named `WINDOW` clause:

```sql
SELECT
  employee_id,
  salary,
  RANK() OVER dept_window AS dept_rank,
  AVG(salary) OVER dept_window AS dept_running_avg
FROM employees
WINDOW dept_window AS (PARTITION BY department ORDER BY salary DESC);
```

## Summary

Window functions in MySQL compute values across related rows while keeping each row in the result set. They replace complex self-joins and subqueries for ranking, running totals, moving averages, and lead/lag comparisons. Key components are `PARTITION BY` (grouping), `ORDER BY` (sequencing), and optional frame clauses (row range). They are available in MySQL 8.0 and are essential for analytical SQL workloads.
