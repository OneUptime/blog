# How to Use WEEK() and YEARWEEK() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Date Function, Week Numbers, Yearweek, Time Series

Description: Learn how to use MySQL's WEEK() and YEARWEEK() functions to extract week numbers from dates for grouping, reporting, and time-series analysis.

---

## Overview

MySQL provides the `WEEK()` and `YEARWEEK()` functions to extract week number information from date and datetime values. These functions are essential when building weekly reports, aggregating time-series data, or implementing scheduling logic.

- `WEEK(date, mode)` - returns the week number (0-53) for a given date
- `YEARWEEK(date, mode)` - returns a combined year and week value (YYYYWW format)

## Syntax

```sql
WEEK(date)
WEEK(date, mode)

YEARWEEK(date)
YEARWEEK(date, mode)
```

The `mode` parameter controls the start day of the week and whether week 1 is the first week with a Sunday/Monday or the first week with more than 3 days. If omitted, MySQL uses the `default_week_format` system variable (default is 0).

## Common Mode Values

| Mode | First Day of Week | Week 1 Definition |
|------|-------------------|--------------------|
| 0    | Sunday            | First Sunday in the year |
| 1    | Monday            | Week with more than 3 days in the new year |
| 2    | Sunday            | First Sunday in the year (range 1-53) |
| 3    | Monday            | ISO 8601 standard |
| 4    | Sunday            | First week with more than 3 days |
| 7    | Monday            | First Monday in the year |

## Basic Usage

```sql
-- Get week number for a specific date
SELECT WEEK('2025-03-15');
-- Returns: 10

-- Get week number with ISO mode (mode 3)
SELECT WEEK('2025-03-15', 3);
-- Returns: 11

-- Get combined year-week
SELECT YEARWEEK('2025-03-15');
-- Returns: 202510

-- Get ISO year-week
SELECT YEARWEEK('2025-03-15', 3);
-- Returns: 202511
```

## Grouping Data by Week

A common use case is aggregating sales or event data by week number:

```sql
-- Count orders per week
SELECT
  WEEK(order_date, 1) AS week_number,
  YEAR(order_date)    AS year,
  COUNT(*)            AS order_count,
  SUM(total_amount)   AS weekly_revenue
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date < '2026-01-01'
GROUP BY YEAR(order_date), WEEK(order_date, 1)
ORDER BY year, week_number;
```

## Using YEARWEEK() to Avoid Year Boundary Issues

When using `WEEK()` alone, week numbers can overlap across years (e.g., week 52 of 2024 and week 52 of 2025 both return 52). Use `YEARWEEK()` to create a unique key that combines year and week:

```sql
-- Safe weekly grouping with YEARWEEK
SELECT
  YEARWEEK(created_at, 1) AS year_week,
  COUNT(*)                AS signups
FROM users
GROUP BY YEARWEEK(created_at, 1)
ORDER BY year_week;
```

This returns results like `202501`, `202502`, ..., `202553` - unique per year.

## Filtering by Current Week

```sql
-- Get all records from the current week
SELECT *
FROM events
WHERE YEARWEEK(event_date, 1) = YEARWEEK(CURDATE(), 1);
```

## Filtering by a Specific Week Range

```sql
-- Find records in weeks 10 through 15 of 2025
SELECT
  event_id,
  event_name,
  event_date
FROM events
WHERE YEARWEEK(event_date, 1) BETWEEN YEARWEEK('2025-03-03', 1) AND YEARWEEK('2025-04-13', 1);
```

## Week-over-Week Comparison

Use `YEARWEEK()` to compare metrics from the current week versus the previous week:

```sql
-- Week-over-week revenue comparison
SELECT
  year_week,
  revenue                                          AS this_week_revenue,
  LAG(revenue) OVER (ORDER BY year_week)           AS last_week_revenue,
  ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY year_week))
    / LAG(revenue) OVER (ORDER BY year_week) * 100,
    2
  )                                                AS pct_change
FROM (
  SELECT YEARWEEK(order_date, 1) AS year_week, SUM(total_amount) AS revenue
  FROM orders
  GROUP BY YEARWEEK(order_date, 1)
) AS weekly_revenue
ORDER BY year_week;
```

## Getting the Start Date of a Week

Since `WEEK()` returns a number rather than a date range, you may want the actual start date:

```sql
-- Calculate the Monday start of a given week
SELECT
  order_id,
  order_date,
  DATE_SUB(order_date, INTERVAL WEEKDAY(order_date) DAY) AS week_start
FROM orders
WHERE YEARWEEK(order_date, 1) = YEARWEEK(CURDATE(), 1);
```

## Practical Example: Weekly Active Users

```sql
-- Count distinct active users per week
SELECT
  YEARWEEK(login_time, 1) AS year_week,
  COUNT(DISTINCT user_id) AS active_users
FROM user_sessions
WHERE login_time >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
GROUP BY YEARWEEK(login_time, 1)
ORDER BY year_week;
```

## Checking the Default Week Format

```sql
-- Check current default_week_format setting
SHOW VARIABLES LIKE 'default_week_format';

-- Temporarily change default mode for the session
SET SESSION default_week_format = 3;
SELECT WEEK('2025-01-01');
```

## Summary

The `WEEK()` function extracts a week number (0-53) from a date and accepts an optional mode parameter to control how weeks are counted and what day they start on. The `YEARWEEK()` function returns a combined YYYYWW integer that uniquely identifies a week across multiple years, making it the safer choice for grouping and filtering in reports. Use mode 1 or 3 for Monday-based weeks and ISO 8601 compliance, and prefer `YEARWEEK()` over `WEEK()` whenever year boundaries might cause duplicate week numbers.
