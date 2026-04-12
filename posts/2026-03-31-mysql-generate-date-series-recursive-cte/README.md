# How to Generate Date Series with Recursive CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recursive CTE, Date, SQL, Query

Description: Learn how to generate a continuous series of dates in MySQL using recursive CTEs, useful for filling gaps in time-series reports and calendar queries.

---

## Why Generate a Date Series?

When you aggregate data by day, week, or month, your result set only contains dates that have data. Dates with no activity are missing entirely, which breaks charts and reports that expect a complete timeline. Generating a date series gives you every date in a range, and you can then left-join your actual data to fill gaps with zeros.

## Basic Daily Date Series

```sql
WITH RECURSIVE date_series AS (
  -- Anchor: the start date
  SELECT DATE('2024-01-01') AS dt

  UNION ALL

  -- Recursive: add one day until the end date
  SELECT DATE_ADD(dt, INTERVAL 1 DAY)
  FROM date_series
  WHERE dt < DATE('2024-01-31')
)
SELECT dt FROM date_series;
```

This produces 31 rows, one for each day in January 2024.

## Parameterizing the Range

Replace hard-coded dates with expressions for flexibility:

```sql
WITH RECURSIVE date_series AS (
  SELECT CURDATE() - INTERVAL 29 DAY AS dt
  UNION ALL
  SELECT DATE_ADD(dt, INTERVAL 1 DAY)
  FROM date_series
  WHERE dt < CURDATE()
)
SELECT dt FROM date_series;
```

This always generates the last 30 days relative to today.

## Filling Gaps in a Report

Combine the date series with a left join to ensure every date appears in the output:

```sql
WITH RECURSIVE date_series AS (
  SELECT DATE('2024-01-01') AS dt
  UNION ALL
  SELECT DATE_ADD(dt, INTERVAL 1 DAY)
  FROM date_series
  WHERE dt < DATE('2024-01-31')
)
SELECT
  ds.dt AS sale_date,
  COALESCE(SUM(o.total), 0) AS daily_revenue,
  COALESCE(COUNT(o.order_id), 0) AS order_count
FROM date_series ds
LEFT JOIN orders o ON DATE(o.created_at) = ds.dt
GROUP BY ds.dt
ORDER BY ds.dt;
```

Without the date series, days with no orders would simply not appear. With it, they show up with zero values.

## Weekly Series

Generate one row per week by incrementing by 7 days:

```sql
WITH RECURSIVE week_series AS (
  SELECT DATE('2024-01-01') AS week_start
  UNION ALL
  SELECT DATE_ADD(week_start, INTERVAL 7 DAY)
  FROM week_series
  WHERE week_start < DATE('2024-12-31')
)
SELECT week_start, DATE_ADD(week_start, INTERVAL 6 DAY) AS week_end
FROM week_series;
```

## Monthly Series

Increment by one month for a monthly calendar:

```sql
WITH RECURSIVE month_series AS (
  SELECT DATE('2024-01-01') AS month_start
  UNION ALL
  SELECT DATE_ADD(month_start, INTERVAL 1 MONTH)
  FROM month_series
  WHERE month_start < DATE('2024-12-01')
)
SELECT
  month_start,
  LAST_DAY(month_start) AS month_end,
  DATE_FORMAT(month_start, '%Y-%m') AS month_label
FROM month_series;
```

## Generating a Calendar Table Temporarily

For more complex calendar logic, build a richer temporary calendar:

```sql
WITH RECURSIVE cal AS (
  SELECT
    DATE('2024-01-01') AS dt,
    IF(DAYOFWEEK(DATE('2024-01-01')) IN (1, 7), 1, 0) AS is_weekend
  UNION ALL
  SELECT
    DATE_ADD(dt, INTERVAL 1 DAY),
    IF(DAYOFWEEK(DATE_ADD(dt, INTERVAL 1 DAY)) IN (1, 7), 1, 0)
  FROM cal
  WHERE dt < DATE('2024-12-31')
)
SELECT
  dt,
  DAYNAME(dt)  AS day_name,
  WEEK(dt)     AS week_num,
  MONTH(dt)    AS month_num,
  is_weekend
FROM cal;
```

## Controlling Recursion Depth

MySQL limits recursion depth with `cte_max_recursion_depth` (default 1000). For ranges longer than 1000 days, increase it:

```sql
SET SESSION cte_max_recursion_depth = 10000;
```

## Summary

Recursive CTEs are the cleanest way to generate a date series in MySQL. By starting with an anchor date and incrementing with `DATE_ADD`, you build daily, weekly, or monthly series of any length. Left-joining your data to the series ensures every period appears in reports even when no rows exist for that date.
