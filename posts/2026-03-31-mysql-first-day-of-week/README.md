# How to Get the First Day of the Week in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database, Query

Description: Learn how to calculate the first day of the current or any given week in MySQL using DAYOFWEEK, WEEKDAY, and date arithmetic expressions.

---

## Understanding Week Start Conventions

MySQL supports two week numbering conventions:
- **Sunday-based**: Week starts on Sunday. Used by `DAYOFWEEK()` (returns 1 for Sunday, 7 for Saturday).
- **Monday-based**: Week starts on Monday. Used by `WEEKDAY()` (returns 0 for Monday, 6 for Sunday).

The ISO 8601 standard defines Monday as the first day of the week. Make sure you pick the correct convention for your application.

## First Day of the Week (Monday-Based)

Using `WEEKDAY()`, which returns 0 for Monday through 6 for Sunday:

```sql
SELECT DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AS week_monday;
-- If today is 2026-03-31 (Tuesday), result: 2026-03-30
```

`WEEKDAY(CURDATE())` returns 1 on a Tuesday (0=Mon, 1=Tue, ...), so subtracting 1 day rolls back to Monday.

## First Day of the Week (Sunday-Based)

Using `DAYOFWEEK()`, which returns 1 for Sunday through 7 for Saturday:

```sql
SELECT DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE()) - 1 DAY) AS week_sunday;
-- If today is 2026-03-31 (Tuesday=3), result: 2026-03-29
```

`DAYOFWEEK()` returns 3 on Tuesday, so subtracting 2 days gives Sunday.

## Apply to Any Date Column

```sql
SELECT
  order_date,
  DATE_SUB(order_date, INTERVAL WEEKDAY(order_date) DAY)     AS iso_week_start,
  DATE_SUB(order_date, INTERVAL DAYOFWEEK(order_date) - 1 DAY) AS us_week_start
FROM orders
LIMIT 5;
```

## Week-to-Date Filtering

Filter rows from the start of the current ISO week to today:

```sql
SELECT order_id, order_date, amount
FROM orders
WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  AND order_date <= CURDATE();
```

## Weekly Aggregation

Group revenue by ISO week start date:

```sql
SELECT
  DATE_SUB(order_date, INTERVAL WEEKDAY(order_date) DAY) AS week_start,
  SUM(amount)  AS weekly_revenue,
  COUNT(*)     AS order_count
FROM orders
GROUP BY week_start
ORDER BY week_start;
```

## First Day of a Specific Week Number

To find the Monday of a given ISO week number in a given year, combine `STR_TO_DATE()` with `%v` (ISO week, Monday as first day):

```sql
-- First day of ISO week 10, year 2026
SELECT STR_TO_DATE('2026 10 1', '%x %v %w') AS week_10_start;
-- 2026-03-02
```

Note: `%x` is the ISO year, `%v` is the ISO week number, and `%w` is the weekday (0 = Sunday in this format, so use `1` for Monday - or adjust accordingly per your MySQL version behavior).

A more reliable cross-version approach:

```sql
-- Week 10 of 2026, Monday start
SELECT
  DATE_ADD(
    MAKEDATE(2026, 1),
    INTERVAL (10 - WEEK(MAKEDATE(2026, 1), 3)) * 7
    - WEEKDAY(MAKEDATE(2026, 1)) DAY
  ) AS week_10_monday;
```

For most production use, the `DATE_SUB` + `WEEKDAY()` pattern on a known date is simpler and more maintainable.

## Handling Week Boundaries Across Year End

The `WEEKDAY()`-based formula handles year-end correctly because it works on the date arithmetic rather than the year number. A date in early January that falls in the previous ISO year's week 52 or 53 will correctly roll back to the prior Monday:

```sql
SELECT
  '2026-01-01' AS date_val,
  DATE_SUB('2026-01-01', INTERVAL WEEKDAY('2026-01-01') DAY) AS iso_week_start;
-- 2025-12-29 (the Monday of that week)
```

## Summary

To get the first day of the week in MySQL, use `DATE_SUB(date, INTERVAL WEEKDAY(date) DAY)` for ISO Monday-start weeks, or `DATE_SUB(date, INTERVAL DAYOFWEEK(date) - 1 DAY)` for US Sunday-start weeks. Apply these in `WHERE` clauses for week-to-date filtering or in `GROUP BY` for weekly aggregations. Always confirm which convention matches your business requirements before deploying.
