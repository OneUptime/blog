# How to Convert a String to a Date in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Date, Conversion, STR_TO_DATE, Function

Description: Learn how to convert string values to MySQL DATE or DATETIME types using STR_TO_DATE(), CAST(), and CONVERT() with format specifiers and practical examples.

---

## Introduction

Converting strings to dates is a common task in MySQL when importing data from external sources, parsing user input, or transforming legacy data. MySQL provides `STR_TO_DATE()` as the primary function for this, along with `CAST()` and `CONVERT()` for standard ISO format strings. Understanding which function to use depends on the input format of your string.

## Using STR_TO_DATE()

`STR_TO_DATE()` is the most flexible option, accepting a format string that describes the layout of the input:

```sql
STR_TO_DATE(str, format)
```

The format specifiers match those of `DATE_FORMAT()`:

```text
%Y - 4-digit year (2026)
%y - 2-digit year (26)
%m - Month number with leading zero (03)
%c - Month number without leading zero (3)
%d - Day with leading zero (31)
%e - Day without leading zero (31)
%H - Hour 24-hour (14)
%i - Minutes (05)
%s - Seconds (00)
```

## Basic Examples

```sql
-- ISO date string
SELECT STR_TO_DATE('2026-03-31', '%Y-%m-%d');
-- Returns: 2026-03-31

-- US date format
SELECT STR_TO_DATE('03/31/2026', '%m/%d/%Y');
-- Returns: 2026-03-31

-- Date with time
SELECT STR_TO_DATE('2026-03-31 14:05:30', '%Y-%m-%d %H:%i:%s');
-- Returns: 2026-03-31 14:05:30

-- Day-Month-Year (European format)
SELECT STR_TO_DATE('31-03-2026', '%d-%m-%Y');
-- Returns: 2026-03-31

-- Month name
SELECT STR_TO_DATE('March 31, 2026', '%M %d, %Y');
-- Returns: 2026-03-31

-- Short month name
SELECT STR_TO_DATE('31-Mar-26', '%d-%b-%y');
-- Returns: 2026-03-31
```

## Handling NULL Results

`STR_TO_DATE()` returns `NULL` if the string does not match the format:

```sql
SELECT STR_TO_DATE('not-a-date', '%Y-%m-%d');
-- Returns: NULL

-- Check for failed conversions
SELECT STR_TO_DATE(date_string, '%m/%d/%Y') IS NULL AS conversion_failed
FROM import_table;
```

## Using CAST() for ISO Strings

If your string is already in `YYYY-MM-DD` format, `CAST()` is simpler:

```sql
SELECT CAST('2026-03-31' AS DATE);
-- Returns: 2026-03-31

SELECT CAST('2026-03-31 14:05:30' AS DATETIME);
-- Returns: 2026-03-31 14:05:30
```

## Using CONVERT()

```sql
SELECT CONVERT('2026-03-31', DATE);
-- Returns: 2026-03-31
```

## Bulk Conversion in UPDATE

When you have a string column that should be a date:

```sql
-- Add a proper date column
ALTER TABLE orders ADD COLUMN order_date DATE;

-- Populate from string column
UPDATE orders
SET order_date = STR_TO_DATE(order_date_str, '%m/%d/%Y')
WHERE order_date_str IS NOT NULL;
```

Validate before converting:

```sql
SELECT order_date_str,
       STR_TO_DATE(order_date_str, '%m/%d/%Y') AS parsed_date
FROM orders
WHERE STR_TO_DATE(order_date_str, '%m/%d/%Y') IS NULL
  AND order_date_str IS NOT NULL;
```

## Using in WHERE Clauses

Filter by a string-represented date:

```sql
SELECT * FROM logs
WHERE log_time >= STR_TO_DATE('2026-01-01', '%Y-%m-%d')
  AND log_time <  STR_TO_DATE('2026-04-01', '%Y-%m-%d');
```

## Handling Unix Timestamps as Strings

```sql
-- String Unix timestamp to DATETIME
SELECT FROM_UNIXTIME(CAST('1774915200' AS UNSIGNED));
-- Returns: 2026-03-31 00:00:00
```

## Summary

Use `STR_TO_DATE(str, format)` to convert strings with non-standard date formats to MySQL DATE or DATETIME values. Use `CAST(str AS DATE)` or `CONVERT(str, DATE)` for ISO format strings. Always validate conversions by checking for NULL results before running bulk UPDATE operations on production data.
