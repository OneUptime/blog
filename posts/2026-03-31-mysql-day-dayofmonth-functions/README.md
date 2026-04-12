# How to Use DAY() and DAYOFMONTH() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database, Query

Description: Learn how to use MySQL DAY() and DAYOFMONTH() to extract the day number from dates, with examples for filtering, grouping, and calendar-based queries.

---

## Overview

MySQL provides two identical functions for extracting the day-of-month from a date: `DAY()` and `DAYOFMONTH()`. Both return an integer from 0 to 31 (0 for dates with a zero day part such as `'0000-00-00'`).

**Syntax:**

```sql
DAY(date)
DAYOFMONTH(date)
```

`DAY()` is simply an alias for `DAYOFMONTH()`. They behave identically and can be used interchangeably.

## Basic Usage

```sql
SELECT DAY('2024-06-15');
-- Returns: 15

SELECT DAYOFMONTH('2024-06-15');
-- Returns: 15

SELECT DAY(NOW());
-- Returns: current day of month, e.g. 31

SELECT DAY('2024-12-31 23:59:59');
-- Returns: 31

SELECT DAY('0000-00-00');
-- Returns: 0
```

## Filtering by Day of Month

Find all transactions that occurred on the 1st of any month:

```sql
SELECT transaction_id, amount, transaction_date
FROM transactions
WHERE DAY(transaction_date) = 1;
```

Find records from today's day number in the current month:

```sql
SELECT *
FROM events
WHERE YEAR(event_date) = YEAR(CURDATE())
  AND MONTH(event_date) = MONTH(CURDATE())
  AND DAY(event_date) = DAY(CURDATE());
```

## Grouping by Day

Count events per day-of-month (useful for detecting patterns like end-of-month spikes):

```sql
SELECT
  DAY(created_at) AS day_of_month,
  COUNT(*)        AS event_count
FROM orders
GROUP BY DAY(created_at)
ORDER BY day_of_month;
```

This can reveal whether certain days of the month drive more activity, such as payday purchasing patterns.

## Combining with YEAR() and MONTH()

For precise date filtering:

```sql
SELECT *
FROM invoices
WHERE YEAR(invoice_date)  = 2024
  AND MONTH(invoice_date) = 6
  AND DAY(invoice_date)   = 15;
```

The equivalent direct comparison (index-friendly for DATE columns):

```sql
SELECT *
FROM invoices
WHERE invoice_date = '2024-06-15';
```

## Finding Records on Specific Days

Find orders placed on the last day of each month (day 28, 29, 30, or 31):

```sql
SELECT order_id, order_date
FROM orders
WHERE DAY(order_date) = DAY(LAST_DAY(order_date));
```

Find orders on any weekend date (using DAYOFWEEK rather than DAY):

```sql
SELECT order_id, order_date
FROM orders
WHERE DAYOFWEEK(order_date) IN (1, 7);
-- 1 = Sunday, 7 = Saturday
```

## Using DAYOFMONTH() in Calculations

Calculate how many days have passed since the start of the current month:

```sql
SELECT DAY(CURDATE()) - 1 AS days_elapsed_in_month;
```

Find records from the first week of any month:

```sql
SELECT *
FROM sales
WHERE DAY(sale_date) <= 7;
```

## Practical Example: Payroll Date Detection

Identify if today is a payroll day (15th or last day of month):

```sql
SELECT
  CASE
    WHEN DAY(CURDATE()) = 15 OR DAY(CURDATE()) = DAY(LAST_DAY(CURDATE()))
    THEN 'Payroll day'
    ELSE 'Not a payroll day'
  END AS payroll_status;
```

## NULL Handling

```sql
SELECT DAY(NULL);
-- Returns: NULL
```

## Summary

`DAY()` and `DAYOFMONTH()` are identical MySQL functions that return the day number (0-31) from a date value. Use them for filtering data by day, detecting end-of-month patterns, or building calendar-based reports. Combine with `YEAR()` and `MONTH()` for precise date targeting, and prefer direct date comparisons over function-wrapped columns on indexed fields for best performance.
