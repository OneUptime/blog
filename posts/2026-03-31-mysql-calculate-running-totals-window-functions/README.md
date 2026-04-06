# How to Calculate Running Totals with Window Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Running Total, Sum, Analytics

Description: Learn how to calculate running totals in MySQL using SUM() OVER() window functions with ORDER BY, PARTITION BY, and frame clauses for accurate cumulative sums.

---

## What Is a Running Total?

A running total (cumulative sum) adds each new row's value to the sum of all preceding rows. MySQL 8.0 window functions make this a single SQL query without self-joins or subqueries.

## Basic Running Total with SUM() OVER()

Calculate a running total of daily sales:

```sql
SELECT
  order_date,
  daily_total,
  SUM(daily_total) OVER (ORDER BY order_date) AS running_total
FROM (
  SELECT DATE(created_at) AS order_date,
         SUM(total_amount) AS daily_total
  FROM orders
  GROUP BY DATE(created_at)
) daily_sales;
```

The `ORDER BY` inside `OVER()` defines the sort order for accumulation. For deterministic row-by-row running totals, specify `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explicitly.

## Running Total with PARTITION BY

Calculate separate running totals per region:

```sql
SELECT
  region,
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (
    PARTITION BY region
    ORDER BY order_date
  ) AS region_running_total
FROM daily_region_sales
ORDER BY region, order_date;
```

`PARTITION BY` resets the running total at the start of each partition group.

## Row-Level Running Total

Apply the running total at individual transaction level:

```sql
SELECT
  id,
  customer_id,
  amount,
  created_at,
  SUM(amount) OVER (
    PARTITION BY customer_id
    ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS customer_running_balance
FROM transactions
ORDER BY customer_id, created_at;
```

## Running Total with ROWS vs RANGE

The frame clause controls which rows are included:

```sql
-- ROWS: physical rows (precise)
SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- RANGE: logical range (includes ties - same date treated as one group)
SUM(amount) OVER (ORDER BY order_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

Use `ROWS` when you need exact row-by-row accumulation and `RANGE` when ties should be treated together.

## Running Total as a Percentage of Final Total

Show each row's contribution to the total as a cumulative percentage:

```sql
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (ORDER BY order_date) AS running_total,
  ROUND(
    100.0 * SUM(daily_revenue) OVER (ORDER BY order_date)
    / SUM(daily_revenue) OVER (),
    2
  ) AS cumulative_pct
FROM daily_revenues
ORDER BY order_date;
```

## Running Total in a View

Encapsulate the running total calculation in a view:

```sql
CREATE VIEW customer_balance_view AS
SELECT
  id          AS transaction_id,
  customer_id,
  amount,
  created_at,
  SUM(amount) OVER (
    PARTITION BY customer_id
    ORDER BY created_at
  ) AS running_balance
FROM transactions;
```

## Summary

Calculate running totals in MySQL 8.0+ using `SUM() OVER (ORDER BY ...)`. Use `PARTITION BY` to reset the running total per group, and choose between `ROWS` and `RANGE` frame clauses based on how you want ties handled. Running totals are efficient in MySQL because they are computed in a single table scan without self-joins.
