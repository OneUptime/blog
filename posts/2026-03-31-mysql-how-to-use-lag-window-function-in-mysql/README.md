# How to Use LAG() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Lag, Analytics, SQL

Description: Learn how to use MySQL's LAG() window function to access a previous row's value within a partition for period-over-period comparisons and change detection.

---

## Overview

`LAG()` is a window function that returns a value from a preceding row within the same result set partition. It allows you to reference earlier rows in an ordered sequence without a self-join, making it ideal for calculating differences from the prior period, detecting value changes, and building running comparisons.

`LAG()` was introduced in MySQL 8.0 alongside other window functions.

## Syntax

```sql
LAG(expr [, offset [, default]])
  OVER (
    [PARTITION BY partition_expr, ...]
    ORDER BY order_expr [ASC | DESC], ...
  )
```

- `expr` - the column or expression to retrieve from a previous row
- `offset` - how many rows back to look (default 1)
- `default` - value to return when no previous row exists (default NULL)

## Basic Example

Given a table of monthly revenue:

```sql
CREATE TABLE monthly_revenue (
  report_month DATE,
  revenue      DECIMAL(12, 2)
);

INSERT INTO monthly_revenue VALUES
  ('2025-01-01', 42000),
  ('2025-02-01', 38500),
  ('2025-03-01', 51000),
  ('2025-04-01', 49000),
  ('2025-05-01', 55000);
```

Use `LAG()` to show the previous month's revenue:

```sql
SELECT
  report_month,
  revenue,
  LAG(revenue) OVER (ORDER BY report_month) AS prev_month_revenue
FROM monthly_revenue;
```

```text
report_month | revenue  | prev_month_revenue
-------------|----------|--------------------
2025-01-01   | 42000.00 | NULL
2025-02-01   | 38500.00 | 42000.00
2025-03-01   | 51000.00 | 38500.00
2025-04-01   | 49000.00 | 51000.00
2025-05-01   | 55000.00 | 49000.00
```

The first row has no previous row, so `LAG()` returns NULL.

## Providing a Default Value

```sql
SELECT
  report_month,
  revenue,
  LAG(revenue, 1, 0) OVER (ORDER BY report_month) AS prev_month_revenue
FROM monthly_revenue;
-- First row shows 0.00 instead of NULL
```

## Calculating Month-over-Month Change

```sql
SELECT
  report_month,
  revenue,
  LAG(revenue) OVER (ORDER BY report_month)                        AS prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY report_month)              AS abs_change,
  ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY report_month))
    / LAG(revenue) OVER (ORDER BY report_month) * 100,
    2
  )                                                                 AS pct_change
FROM monthly_revenue;
```

## Using LAG() with PARTITION BY

Use `PARTITION BY` to keep LAG() within logical groups:

```sql
CREATE TABLE regional_sales (
  region      VARCHAR(50),
  sale_month  DATE,
  revenue     DECIMAL(12, 2)
);

INSERT INTO regional_sales VALUES
  ('East', '2025-01-01', 20000), ('East', '2025-02-01', 22000), ('East', '2025-03-01', 18000),
  ('West', '2025-01-01', 35000), ('West', '2025-02-01', 33000), ('West', '2025-03-01', 37000);

SELECT
  region,
  sale_month,
  revenue,
  LAG(revenue) OVER (PARTITION BY region ORDER BY sale_month) AS prev_month
FROM regional_sales;
```

Without `PARTITION BY`, LAG() would incorrectly reference the last row of the previous region.

## Looking Multiple Rows Back

```sql
-- Compare to the same period 3 months ago
SELECT
  report_month,
  revenue,
  LAG(revenue, 3) OVER (ORDER BY report_month) AS revenue_3m_ago
FROM monthly_revenue;
```

## Year-over-Year Comparison with Monthly Data

```sql
-- Compare current month to 12 months prior
SELECT
  report_month,
  revenue,
  LAG(revenue, 12, NULL) OVER (ORDER BY report_month) AS yoy_revenue,
  ROUND(
    (revenue - LAG(revenue, 12) OVER (ORDER BY report_month))
    / LAG(revenue, 12) OVER (ORDER BY report_month) * 100,
    1
  )                                                    AS yoy_pct_change
FROM monthly_revenue;
```

## Detecting Status Changes

Find rows where a value transitions from a previous state:

```sql
SELECT *
FROM (
  SELECT
    order_id,
    status_time,
    status,
    LAG(status) OVER (PARTITION BY order_id ORDER BY status_time) AS prev_status
  FROM order_status_history
) AS t
WHERE prev_status IS NOT NULL
  AND prev_status <> status;
```

## Calculating Time Since Last Event

```sql
SELECT
  user_id,
  event_time,
  event_type,
  LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)   AS prev_event_time,
  TIMESTAMPDIFF(
    MINUTE,
    LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time),
    event_time
  )                                                                   AS minutes_since_last
FROM user_events;
```

## Filtering with LAG() in a Subquery

Window functions cannot appear in WHERE clauses, so wrap them:

```sql
SELECT *
FROM (
  SELECT
    report_month,
    revenue,
    LAG(revenue) OVER (ORDER BY report_month) AS prev_revenue
  FROM monthly_revenue
) AS t
WHERE revenue < prev_revenue;
-- Months where revenue declined from the previous month
```

## Combining LAG() and LEAD() for Range Context

```sql
SELECT
  sale_date,
  revenue,
  LAG(revenue)  OVER (ORDER BY sale_date) AS yesterday,
  revenue                                  AS today,
  LEAD(revenue) OVER (ORDER BY sale_date) AS tomorrow
FROM daily_sales;
```

## Summary

`LAG()` looks backward in an ordered partition to return a value from a previous row without a self-join. It accepts an optional offset to look further back and a default value for rows with no predecessor. Use `PARTITION BY` to restrict the look-back to the same logical group. `LAG()` is the go-to function for period-over-period comparisons, detecting when a value changes, and computing elapsed time between consecutive events in a time-ordered dataset.
