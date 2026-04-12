# How to Use LEAD() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, LEAD, Analytics, SQL

Description: Learn how to use MySQL's LEAD() window function to access the next row's value within a partition, enabling period-over-period comparisons and trend analysis.

---

## Overview

`LEAD()` is a window function that returns a value from a subsequent row within the same result set partition. It lets you look forward in the ordered result without a self-join, making it ideal for calculating differences between consecutive rows, detecting changes, and building time-series comparisons.

`LEAD()` was introduced in MySQL 8.0.

## Syntax

```sql
LEAD(expr [, offset [, default]])
  OVER (
    [PARTITION BY partition_expr, ...]
    ORDER BY order_expr [ASC | DESC], ...
  )
```

- `expr` - the column or expression to retrieve from the next row
- `offset` - how many rows ahead to look (default 1)
- `default` - value to return when the look-ahead row does not exist (default NULL)

## Basic Example

Given a table of daily sales:

```sql
CREATE TABLE daily_sales (
  sale_date   DATE,
  revenue     DECIMAL(12, 2)
);

INSERT INTO daily_sales VALUES
  ('2025-03-01', 1200.00),
  ('2025-03-02', 1350.00),
  ('2025-03-03', 980.00),
  ('2025-03-04', 1500.00),
  ('2025-03-05', 1420.00);
```

Use `LEAD()` to show the next day's revenue alongside the current day:

```sql
SELECT
  sale_date,
  revenue,
  LEAD(revenue) OVER (ORDER BY sale_date) AS next_day_revenue
FROM daily_sales;
```

```text
sale_date   | revenue  | next_day_revenue
------------|----------|------------------
2025-03-01  | 1200.00  | 1350.00
2025-03-02  | 1350.00  |  980.00
2025-03-03  |  980.00  | 1500.00
2025-03-04  | 1500.00  | 1420.00
2025-03-05  | 1420.00  | NULL
```

The last row has no next row, so `LEAD()` returns NULL.

## Providing a Default Value

```sql
SELECT
  sale_date,
  revenue,
  LEAD(revenue, 1, 0) OVER (ORDER BY sale_date) AS next_day_revenue
FROM daily_sales;
-- Last row shows 0.00 instead of NULL
```

## Calculating Day-over-Day Change

```sql
SELECT
  sale_date,
  revenue,
  LEAD(revenue) OVER (ORDER BY sale_date)          AS tomorrow_revenue,
  LEAD(revenue) OVER (ORDER BY sale_date) - revenue AS change_tomorrow
FROM daily_sales;
```

## Using LEAD() with PARTITION BY

When your data spans multiple groups (e.g., multiple products or regions), use `PARTITION BY` so that `LEAD()` only looks within each group:

```sql
CREATE TABLE product_sales (
  product_id  INT,
  sale_date   DATE,
  revenue     DECIMAL(12, 2)
);

INSERT INTO product_sales VALUES
  (1, '2025-03-01', 500), (1, '2025-03-02', 550), (1, '2025-03-03', 480),
  (2, '2025-03-01', 800), (2, '2025-03-02', 820), (2, '2025-03-03', 790);

SELECT
  product_id,
  sale_date,
  revenue,
  LEAD(revenue) OVER (PARTITION BY product_id ORDER BY sale_date) AS next_day
FROM product_sales;
```

This ensures the last row of product 1 does not peek into product 2's data.

## Looking Multiple Rows Ahead

```sql
-- Get the revenue 7 days in the future
SELECT
  sale_date,
  revenue,
  LEAD(revenue, 7) OVER (ORDER BY sale_date) AS revenue_7_days_ahead
FROM daily_sales;
```

## Detecting Value Changes

Use `LEAD()` to find rows where the status changes in the next event:

```sql
SELECT *
FROM (
  SELECT
    user_id,
    event_time,
    status,
    LEAD(status) OVER (PARTITION BY user_id ORDER BY event_time) AS next_status
  FROM user_events
) AS t
WHERE next_status IS NOT NULL
  AND next_status <> status;
```

## Calculating Time to Next Event

```sql
SELECT
  user_id,
  event_time,
  event_type,
  LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time)   AS next_event_time,
  TIMESTAMPDIFF(
    MINUTE,
    event_time,
    LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time)
  )                                                                   AS minutes_to_next
FROM user_events;
```

## Practical Example: Month-over-Month Revenue Forecast

```sql
SELECT
  month,
  revenue,
  LEAD(revenue, 1, revenue) OVER (ORDER BY month)  AS next_month_est,
  ROUND(
    (LEAD(revenue) OVER (ORDER BY month) - revenue) / revenue * 100,
    1
  )                                                 AS pct_growth
FROM monthly_revenue
ORDER BY month;
```

## Wrapping LEAD() in a Subquery

Because window functions cannot be used in WHERE clauses directly, wrap them in a subquery:

```sql
SELECT *
FROM (
  SELECT
    sale_date,
    revenue,
    LEAD(revenue) OVER (ORDER BY sale_date) AS next_revenue
  FROM daily_sales
) AS t
WHERE next_revenue < revenue;
-- Rows where tomorrow's revenue is expected to drop
```

## Summary

`LEAD()` looks ahead in an ordered partition to return a value from a future row without a self-join. It accepts an optional offset to look further ahead and a default value for rows with no subsequent row. Combined with `PARTITION BY`, it works correctly across multiple groups. Use `LEAD()` for day-over-day or period-over-period comparisons, change detection, and any analysis that needs to reference upcoming rows in a sequence.
