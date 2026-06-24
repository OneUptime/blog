# How to Calculate Moving Averages with Window Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Moving Average, Analytics, AVG

Description: Learn how to calculate simple, weighted, and exponential moving averages in MySQL 8.0 using AVG() OVER() with sliding window frame clauses.

---

## What Is a Moving Average?

A moving average smooths out short-term fluctuations in time-series data by averaging a rolling window of rows. MySQL 8.0 window functions make this straightforward with `AVG() OVER()` and a frame clause.

## Simple Moving Average (N-Day Average)

Calculate a 7-day moving average of daily sales:

```sql
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS ma_7day
FROM daily_revenues
ORDER BY order_date;
```

`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` includes the current row plus the 6 rows before it - a 7-row window.

## 30-Day and 90-Day Moving Averages

Compare multiple windows side by side:

```sql
SELECT
  order_date,
  daily_revenue,
  ROUND(AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS ma_7,
  ROUND(AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ), 2) AS ma_30,
  ROUND(AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 89 PRECEDING AND CURRENT ROW
  ), 2) AS ma_90
FROM daily_revenues
ORDER BY order_date;
```

## Partitioned Moving Average

Calculate moving averages per product category independently:

```sql
SELECT
  category,
  sale_date,
  revenue,
  ROUND(AVG(revenue) OVER (
    PARTITION BY category
    ORDER BY sale_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS category_ma_7day
FROM category_sales
ORDER BY category, sale_date;
```

## Centered Moving Average

A centered average uses rows both before and after the current row:

```sql
SELECT
  order_date,
  daily_revenue,
  AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
  ) AS centered_ma_7
FROM daily_revenues
ORDER BY order_date;
```

Note: the first and last few rows will have fewer points available - MySQL automatically uses whatever rows exist within the window.

## Exponential Moving Average (EMA)

MySQL does not have a built-in EMA function. Use a recursive CTE to compute it:

```sql
WITH RECURSIVE ema_calc AS (
  SELECT
    order_date,
    daily_revenue,
    daily_revenue AS ema,
    ROW_NUMBER() OVER (ORDER BY order_date) AS rn
  FROM daily_revenues
  WHERE order_date = (SELECT MIN(order_date) FROM daily_revenues)

  UNION ALL

  SELECT
    d.order_date,
    d.daily_revenue,
    0.1 * d.daily_revenue + 0.9 * e.ema,  -- alpha = 0.1
    e.rn + 1
  FROM daily_revenues d
  JOIN ema_calc e ON d.order_date = DATE_ADD(e.order_date, INTERVAL 1 DAY)
)
SELECT order_date, daily_revenue, ROUND(ema, 2) AS ema
FROM ema_calc
ORDER BY order_date;
```

## Using the Moving Average in a View

```sql
CREATE VIEW revenue_with_moving_avg AS
SELECT
  order_date,
  daily_revenue,
  ROUND(AVG(daily_revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS ma_7day
FROM daily_revenues;
```

## Summary

Calculate moving averages in MySQL 8.0+ using `AVG() OVER()` with a `ROWS BETWEEN N PRECEDING AND CURRENT ROW` frame clause. Use `PARTITION BY` for independent averages per group, and adjust the window size to 7, 30, or 90 rows as needed. For exponential moving averages, use a recursive CTE with a chosen smoothing factor.
