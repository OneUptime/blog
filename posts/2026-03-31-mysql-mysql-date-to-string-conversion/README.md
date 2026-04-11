# How to Convert a Date to a String in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Date, Conversion, DATE_FORMAT, Function

Description: Learn how to convert MySQL DATE and DATETIME values to formatted strings using DATE_FORMAT(), CAST(), and other functions with practical format examples.

---

## Introduction

Converting dates to strings in MySQL is needed when formatting output for display, building export files with specific date layouts, constructing filenames or keys, and joining date values with text in string concatenation. MySQL provides `DATE_FORMAT()` as the primary tool, along with `CAST()` and `CONVERT()` for simple ISO format output.

## Using DATE_FORMAT()

`DATE_FORMAT()` is the most flexible date-to-string function in MySQL:

```sql
DATE_FORMAT(date, format)
```

## Format Specifier Reference

```text
%Y - 4-digit year (2026)
%y - 2-digit year (26)
%m - Month number, zero-padded (03)
%c - Month number, no padding (3)
%M - Month name (March)
%b - Abbreviated month name (Mar)
%d - Day, zero-padded (31)
%e - Day, no padding (31)
%D - Day with suffix (31st)
%H - Hour, 24-hour, zero-padded (14)
%h - Hour, 12-hour, zero-padded (02)
%i - Minutes, zero-padded (05)
%s - Seconds, zero-padded (00)
%p - AM/PM
%W - Weekday name (Tuesday)
%a - Abbreviated weekday (Tue)
%j - Day of year (090)
%w - Day of week number (0=Sunday)
%U - Week number (0-53, week starts Sunday)
%V - Week number (01-53, week starts Sunday)
```

## Common Date Format Examples

```sql
-- ISO 8601 date
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d');
-- Returns: 2026-03-31

-- ISO 8601 datetime
SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s');
-- Returns: 2026-03-31T14:05:30

-- US date format
SELECT DATE_FORMAT('2026-03-31', '%m/%d/%Y');
-- Returns: 03/31/2026

-- European date format
SELECT DATE_FORMAT('2026-03-31', '%d/%m/%Y');
-- Returns: 31/03/2026

-- Long date with month name
SELECT DATE_FORMAT('2026-03-31', '%M %d, %Y');
-- Returns: March 31, 2026

-- Short date with abbreviated month
SELECT DATE_FORMAT('2026-03-31', '%d-%b-%y');
-- Returns: 31-Mar-26

-- 12-hour time with AM/PM
SELECT DATE_FORMAT(NOW(), '%h:%i %p');
-- Returns: 02:05 PM

-- Day name and date
SELECT DATE_FORMAT('2026-03-31', '%W, %M %D %Y');
-- Returns: Tuesday, March 31st 2026
```

## Using CAST() for Simple ISO Output

For standard ISO date string conversion:

```sql
SELECT CAST(NOW() AS CHAR);
-- Returns: 2026-03-31 14:05:30

SELECT CAST(CURDATE() AS CHAR);
-- Returns: 2026-03-31
```

## Using CONVERT() with Character Set

```sql
SELECT CONVERT(NOW(), CHAR);
-- Returns: 2026-03-31 14:05:30

-- With charset specification
SELECT CONVERT(NOW() USING utf8mb4);
-- Returns: 2026-03-31 14:05:30
```

## Practical Use Cases

### Building a File Name

```sql
SELECT CONCAT(
  'report_',
  DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s'),
  '.csv'
) AS filename;
-- Returns: report_20260331_140530.csv
```

### Grouping and Labeling by Month

```sql
SELECT
  DATE_FORMAT(order_date, '%Y-%m') AS month,
  COUNT(*) AS orders,
  SUM(total) AS revenue
FROM orders
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY month;
```

### Formatting in SELECT for Display

```sql
SELECT
  id,
  customer_id,
  DATE_FORMAT(created_at, '%W, %M %e, %Y at %l:%i %p') AS formatted_date
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

### Converting to Unix Timestamp String

```sql
SELECT CAST(UNIX_TIMESTAMP(NOW()) AS CHAR) AS unix_ts_string;
-- Returns: 1743379530
```

## Summary

`DATE_FORMAT()` is the primary function for converting MySQL dates and datetimes to formatted strings. Use it when you need non-ISO formats like US dates, European dates, long month names, or custom patterns for reports. Use `CAST(date AS CHAR)` or `CONVERT(date, CHAR)` for simple ISO-format string output. Avoid converting dates to strings in WHERE clauses - keep date comparisons as date types for index efficiency.
