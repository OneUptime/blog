# How to Use WEEKDAY() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Weekday, Date Function, Day Of Week, SQL

Description: Learn how to use MySQL's WEEKDAY() function to get the day-of-week index (Monday=0 to Sunday=6) and apply it to business day filtering.

---

## Overview

The `WEEKDAY()` function in MySQL returns the weekday index of a date, where Monday is 0 and Sunday is 6. This differs from `DAYOFWEEK()`, which uses a 1-7 scale starting on Sunday. `WEEKDAY()` aligns with ISO 8601 conventions, making it natural for business logic.

## Basic Syntax

```sql
WEEKDAY(date)
```

Returns an integer: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday.

## Basic Examples

```sql
SELECT WEEKDAY('2024-01-01');  -- 0 (Monday)
SELECT WEEKDAY('2024-01-06');  -- 5 (Saturday)
SELECT WEEKDAY('2024-01-07');  -- 6 (Sunday)
SELECT WEEKDAY(NOW());         -- current weekday index
```

## Filtering Weekdays and Weekends

```sql
-- Get records from weekdays only (Mon-Fri = 0 to 4)
SELECT * FROM orders
WHERE WEEKDAY(order_date) < 5;

-- Get records from weekends only (Sat=5, Sun=6)
SELECT * FROM orders
WHERE WEEKDAY(order_date) >= 5;

-- Count business day vs weekend transactions
SELECT
  CASE WHEN WEEKDAY(txn_date) < 5 THEN 'Weekday' ELSE 'Weekend' END AS day_type,
  COUNT(*) AS txn_count,
  SUM(amount) AS total
FROM transactions
GROUP BY day_type;
```

## Mapping Index to Day Name

```sql
SELECT WEEKDAY(order_date) AS wd_index,
  ELT(WEEKDAY(order_date) + 1, 'Monday','Tuesday','Wednesday',
      'Thursday','Friday','Saturday','Sunday') AS day_name,
  COUNT(*) AS orders
FROM orders
GROUP BY wd_index, day_name
ORDER BY wd_index;
```

## Finding the Next Business Day

```sql
-- If today is Friday (4), next business day is Monday (+3 days)
-- If Saturday (5) -> +2, Sunday (6) -> +1, otherwise +1
SELECT
  CURDATE() AS today,
  CASE WEEKDAY(CURDATE())
    WHEN 4 THEN DATE_ADD(CURDATE(), INTERVAL 3 DAY)  -- Friday
    WHEN 5 THEN DATE_ADD(CURDATE(), INTERVAL 2 DAY)  -- Saturday
    ELSE DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  END AS next_business_day;
```

## Calculating Business Days Between Two Dates

```sql
-- Approximate business days between two dates
-- (excludes weekends, does not account for holidays)
SELECT
  DATEDIFF('2024-12-31', '2024-01-01') AS total_days,
  FLOOR(DATEDIFF('2024-12-31', '2024-01-01') / 7) * 5 +
    MID('0123444401233334012222340111123400012345001234550',
      WEEKDAY('2024-01-01') * 7 + WEEKDAY('2024-12-31') + 1, 1) AS business_days;
```

A cleaner approach using a calendar table is recommended for production use.

## Using WEEKDAY() in Reports

```sql
-- Weekly sales pattern report
SELECT
  ELT(WEEKDAY(sale_date) + 1, 'Mon','Tue','Wed','Thu','Fri','Sat','Sun') AS day,
  AVG(amount) AS avg_sale,
  MAX(amount) AS max_sale
FROM sales
WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY WEEKDAY(sale_date)
ORDER BY WEEKDAY(sale_date);
```

## WEEKDAY() vs DAYOFWEEK()

```sql
-- Comparison of the two functions for the same date
SELECT
  '2024-01-01' AS date_val,
  DAYOFWEEK('2024-01-01') AS dayofweek_result,  -- 2 (Monday, 1=Sunday start)
  WEEKDAY('2024-01-01')   AS weekday_result;    -- 0 (Monday, 0=Monday start)
```

Use `WEEKDAY()` when working with ISO week conventions or when 0-based Monday indexing is more natural. Use `DAYOFWEEK()` for ODBC-compatible code.

## Summary

`WEEKDAY()` returns a 0-6 integer with Monday as 0 and Sunday as 6, making it ideal for ISO-aligned business logic and weekday/weekend filtering. It pairs well with `ELT()` for label mapping and `DATE_ADD()` for computing next business days. When placed on indexed columns, add a generated index column to avoid full scans.
