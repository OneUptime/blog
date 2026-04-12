# How to Generate Weekly Reports in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Report, WEEK, GROUP BY, Aggregation

Description: Learn how to generate weekly reports in MySQL using YEARWEEK(), WEEK(), and date arithmetic to group and aggregate data by ISO week or calendar week.

---

## Grouping by Week in MySQL

MySQL provides several ways to group data by week. Choose the right function based on your week numbering convention.

## Using YEARWEEK()

`YEARWEEK()` returns a unique `YYYYWW` number combining year and week, preventing year-boundary ambiguities:

```sql
SELECT
  YEARWEEK(order_date, 3)       AS year_week,  -- Mode 3: ISO weeks
  MIN(DATE(order_date))         AS week_start,
  MAX(DATE(order_date))         AS week_end,
  COUNT(*)                      AS order_count,
  SUM(total_amount)             AS weekly_revenue,
  AVG(total_amount)             AS avg_order_value
FROM orders
WHERE order_date >= CURDATE() - INTERVAL 12 WEEK
GROUP BY YEARWEEK(order_date, 3)
ORDER BY year_week;
```

## Week Start/End Calculation

Show explicit week start and end dates for readability:

```sql
SELECT
  YEARWEEK(order_date, 3) AS year_week,
  DATE(order_date) - INTERVAL (DAYOFWEEK(order_date) + 5) % 7 DAY AS week_start,
  DATE(order_date) - INTERVAL (DAYOFWEEK(order_date) + 5) % 7 DAY + INTERVAL 6 DAY AS week_end,
  COUNT(*) AS orders,
  SUM(total_amount) AS revenue
FROM orders
GROUP BY year_week, week_start, week_end
ORDER BY year_week;
```

## Week-over-Week Comparison

Use `LAG()` to compare each week to the prior week:

```sql
WITH weekly_revenue AS (
  SELECT
    YEARWEEK(order_date, 3) AS year_week,
    SUM(total_amount) AS revenue
  FROM orders
  GROUP BY YEARWEEK(order_date, 3)
)
SELECT
  year_week,
  revenue,
  LAG(revenue) OVER (ORDER BY year_week) AS prev_week_revenue,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY year_week))
    / NULLIF(LAG(revenue) OVER (ORDER BY year_week), 0),
    2
  ) AS wow_growth_pct
FROM weekly_revenue
ORDER BY year_week;
```

## Weekly Report by Day of Week Breakdown

Show per-day totals within each week:

```sql
SELECT
  YEARWEEK(order_date, 3)                         AS year_week,
  DAYNAME(order_date)                             AS day_name,
  DAYOFWEEK(order_date)                           AS day_num,
  COUNT(*)                                        AS orders,
  SUM(total_amount)                               AS revenue
FROM orders
WHERE order_date >= CURDATE() - INTERVAL 4 WEEK
GROUP BY year_week, day_name, day_num
ORDER BY year_week, day_num;
```

## Storing Weekly Reports

Pre-aggregate for fast dashboard access:

```sql
CREATE TABLE weekly_order_report (
  year_week       INT UNSIGNED NOT NULL,
  week_start_date DATE NOT NULL,
  order_count     INT UNSIGNED NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unique_customers INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (year_week)
) ENGINE=InnoDB;

INSERT INTO weekly_order_report
  (year_week, week_start_date, order_count, total_revenue, unique_customers)
SELECT
  YEARWEEK(order_date, 3),
  MIN(DATE(order_date)) - INTERVAL WEEKDAY(MIN(DATE(order_date))) DAY,
  COUNT(*),
  SUM(total_amount),
  COUNT(DISTINCT customer_id)
FROM orders
WHERE YEARWEEK(order_date, 3) = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 3)
ON DUPLICATE KEY UPDATE
  order_count      = VALUES(order_count),
  total_revenue    = VALUES(total_revenue),
  unique_customers = VALUES(unique_customers);
```

## Summary

Generate weekly reports in MySQL using `YEARWEEK(date, 3)` for ISO week numbers to avoid year-boundary issues. Group by `YEARWEEK` and calculate week start/end dates using date arithmetic. Use `LAG()` for week-over-week comparison, and pre-aggregate into a report table for dashboard performance.
