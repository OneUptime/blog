# How to Use FIRST_VALUE() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, First Value, Window Function, SQL, Analytics

Description: Learn how to use MySQL's FIRST_VALUE() window function to retrieve the first value in an ordered window frame for comparison and gap analysis.

---

## Overview

`FIRST_VALUE()` is a MySQL 8.0 window function that returns the value of an expression from the first row of the window frame. It is useful for comparing each row against the first value in its partition, such as comparing sales to the first sale of a period, or finding the oldest record in a group.

## Basic Syntax

```sql
FIRST_VALUE(expr) OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
  [frame_clause]
)
```

With `ORDER BY`, MySQL's default frame ends at the current row. `FIRST_VALUE()` still returns the first row of that frame, so you usually do not need `UNBOUNDED FOLLOWING` just to see the partition's first value.

## Basic Examples

```sql
-- First salary in the ordered list for each department
SELECT name, department, salary,
  FIRST_VALUE(salary) OVER (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS highest_salary
FROM employees;

-- First sale amount for each customer (chronologically)
SELECT customer_id, sale_date, amount,
  FIRST_VALUE(amount) OVER (
    PARTITION BY customer_id
    ORDER BY sale_date
  ) AS first_purchase_amount
FROM sales;
```

## Comparing Each Row to the First Row

```sql
CREATE TABLE monthly_revenue (
  month DATE,
  department VARCHAR(50),
  revenue DECIMAL(12,2)
);

INSERT INTO monthly_revenue VALUES
('2024-01-01', 'Sales', 100000),
('2024-02-01', 'Sales', 120000),
('2024-03-01', 'Sales', 95000),
('2024-04-01', 'Sales', 130000),
('2024-01-01', 'Marketing', 50000),
('2024-02-01', 'Marketing', 60000),
('2024-03-01', 'Marketing', 55000);

-- Compare each month's revenue to the first month of the year
SELECT
  department,
  month,
  revenue,
  FIRST_VALUE(revenue) OVER (
    PARTITION BY department
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS jan_revenue,
  ROUND(revenue / FIRST_VALUE(revenue) OVER (
    PARTITION BY department
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) * 100 - 100, 1) AS pct_change_from_jan
FROM monthly_revenue
ORDER BY department, month;
```

## Tracking the Earliest Record in Each Group

```sql
CREATE TABLE customer_orders (
  order_id INT,
  customer_id INT,
  product VARCHAR(100),
  order_date DATE
);

INSERT INTO customer_orders VALUES
(1, 101, 'Widget', '2024-01-15'),
(2, 101, 'Gadget', '2024-03-20'),
(3, 102, 'Widget', '2024-02-10'),
(4, 101, 'Widget', '2024-05-05');

-- Show each order alongside the customer's very first product
SELECT
  order_id,
  customer_id,
  product,
  order_date,
  FIRST_VALUE(product) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS first_product_purchased
FROM customer_orders
ORDER BY customer_id, order_date;
```

## Understanding the Frame Clause

```sql
-- With default frame (UNBOUNDED PRECEDING to CURRENT ROW):
-- FIRST_VALUE always returns the same value once seen
SELECT day, sales,
  FIRST_VALUE(sales) OVER (ORDER BY day) AS running_first
FROM daily_sales;
-- running_first is always the first day's sales

-- With explicit full frame:
SELECT day, sales,
  FIRST_VALUE(sales) OVER (
    ORDER BY day
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS overall_first
FROM daily_sales;
-- same result, but more explicit
```

## FIRST_VALUE() vs MIN()/MAX()

```sql
-- FIRST_VALUE: returns the value from the first row in ORDER BY sequence
-- MIN: returns the minimum value regardless of order

SELECT name, score,
  FIRST_VALUE(name) OVER (ORDER BY score DESC) AS top_scorer_name,
  MAX(score) OVER () AS max_score
FROM leaderboard;
-- FIRST_VALUE(name) gives the name of the highest scorer
-- MIN/MAX gives the extreme values without the associated row's other columns
```

## Practical Example: Baseline Comparison for Experiments

```sql
-- A/B test: compare each week's conversion rate to the pre-experiment baseline
SELECT
  week,
  variant,
  conversions,
  FIRST_VALUE(conversions) OVER (
    PARTITION BY variant
    ORDER BY week
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS baseline_week1_conversions,
  conversions - FIRST_VALUE(conversions) OVER (
    PARTITION BY variant
    ORDER BY week
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lift
FROM ab_test_results
ORDER BY variant, week;
```

## Summary

`FIRST_VALUE()` returns the value from the first row of the window frame. Use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to access the absolute first value of the entire partition regardless of the current row's position. It is ideal for baseline comparisons, tracking first purchases, and computing growth relative to a starting point.
