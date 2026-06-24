# How to Calculate Moving Averages in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, Moving Average, Analytics, SQL

Description: Learn how to calculate simple, weighted, and exponential moving averages in MySQL using window functions like AVG() OVER and SUM() OVER with ROWS BETWEEN.

---

## What Is a Moving Average

A moving average smooths time-series data by averaging values over a sliding window of rows. It is widely used in financial analysis (stock prices), metrics monitoring (request rates), and business reporting (sales trends).

MySQL 8.0 window functions make moving averages straightforward to compute without self-joins or correlated subqueries.

## Sample Dataset

```sql
CREATE TABLE daily_sales (
  sale_date DATE PRIMARY KEY,
  revenue   DECIMAL(10,2)
);

INSERT INTO daily_sales VALUES
  ('2026-01-01', 1000),
  ('2026-01-02', 1200),
  ('2026-01-03', 900),
  ('2026-01-04', 1500),
  ('2026-01-05', 1100),
  ('2026-01-06', 1300),
  ('2026-01-07', 1400),
  ('2026-01-08', 1600),
  ('2026-01-09', 1200),
  ('2026-01-10', 1800);
```

## 7-Day Simple Moving Average

```sql
SELECT
  sale_date,
  revenue,
  ROUND(
    AVG(revenue) OVER (
      ORDER BY sale_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS moving_avg_7d
FROM daily_sales
ORDER BY sale_date;
```

```text
+------------+---------+---------------+
| sale_date  | revenue | moving_avg_7d |
+------------+---------+---------------+
| 2026-01-01 | 1000.00 |       1000.00 |
| 2026-01-02 | 1200.00 |       1100.00 |
| 2026-01-03 |  900.00 |       1033.33 |
| 2026-01-04 | 1500.00 |       1150.00 |
| 2026-01-05 | 1100.00 |       1140.00 |
| 2026-01-06 | 1300.00 |       1166.67 |
| 2026-01-07 | 1400.00 |       1200.00 |
| 2026-01-08 | 1600.00 |       1285.71 |
| 2026-01-09 | 1200.00 |       1285.71 |
| 2026-01-10 | 1800.00 |       1414.29 |
+------------+---------+---------------+
```

The `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` means: include the current row and up to 6 rows before it (7 rows total).

## 3-Day Moving Average

```sql
SELECT
  sale_date,
  revenue,
  ROUND(
    AVG(revenue) OVER (
      ORDER BY sale_date
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS moving_avg_3d
FROM daily_sales
ORDER BY sale_date;
```

## Centered Moving Average

A centered moving average uses rows before AND after the current row:

```sql
SELECT
  sale_date,
  revenue,
  ROUND(
    AVG(revenue) OVER (
      ORDER BY sale_date
      ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ),
    2
  ) AS centered_avg_5d
FROM daily_sales
ORDER BY sale_date;
```

## Running (Cumulative) Average

```sql
SELECT
  sale_date,
  revenue,
  ROUND(
    AVG(revenue) OVER (
      ORDER BY sale_date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    2
  ) AS cumulative_avg
FROM daily_sales
ORDER BY sale_date;
```

## Moving Average with Partition by Category

Calculate separate moving averages for each product category:

```sql
SELECT
  sale_date,
  category,
  revenue,
  ROUND(
    AVG(revenue) OVER (
      PARTITION BY category
      ORDER BY sale_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS category_moving_avg_7d
FROM category_sales
ORDER BY category, sale_date;
```

## Moving Sum (Rolling Total)

```sql
SELECT
  sale_date,
  revenue,
  SUM(revenue) OVER (
    ORDER BY sale_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS rolling_7d_total
FROM daily_sales
ORDER BY sale_date;
```

## Comparing Revenue to Moving Average

A common pattern is to flag days where revenue is significantly below the moving average:

```sql
SELECT
  sale_date,
  revenue,
  ROUND(ma7.moving_avg, 2) AS moving_avg_7d,
  CASE
    WHEN revenue < ma7.moving_avg * 0.8 THEN 'Below Trend'
    WHEN revenue > ma7.moving_avg * 1.2 THEN 'Above Trend'
    ELSE 'Normal'
  END AS trend_status
FROM daily_sales
JOIN (
  SELECT
    sale_date,
    AVG(revenue) OVER (
      ORDER BY sale_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg
  FROM daily_sales
) ma7 USING (sale_date)
ORDER BY sale_date;
```

## MySQL 5.7 Workaround (Without Window Functions)

For MySQL 5.7, use a self-join:

```sql
SELECT
  a.sale_date,
  a.revenue,
  ROUND(AVG(b.revenue), 2) AS moving_avg_7d
FROM daily_sales a
JOIN daily_sales b
  ON b.sale_date BETWEEN DATE_SUB(a.sale_date, INTERVAL 6 DAY) AND a.sale_date
GROUP BY a.sale_date, a.revenue
ORDER BY a.sale_date;
```

## Summary

MySQL 8.0 window functions make moving averages elegant and efficient. Use `AVG() OVER (ORDER BY ... ROWS BETWEEN N PRECEDING AND CURRENT ROW)` for trailing moving averages, add `PARTITION BY` to compute per-group averages, and use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` for cumulative averages. For MySQL 5.7, a self-join is the fallback.
