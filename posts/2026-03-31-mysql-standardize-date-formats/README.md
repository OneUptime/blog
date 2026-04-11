# How to Standardize Date Formats in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Date, Data Cleaning, STR_TO_DATE, Format

Description: Learn how to identify and convert inconsistent date formats in MySQL using STR_TO_DATE, DATE_FORMAT, and ALTER TABLE to standardize on native date types.

---

## Why Date Format Standardization Matters

Date data stored as strings is a common source of bugs. Comparisons fail, sorts are incorrect, and functions like `DATEDIFF` or `DATE_ADD` refuse to work on text. The goal is to convert everything to MySQL's native `DATE` or `DATETIME` type.

## Identifying Non-Standard Dates

Find rows that cannot be parsed as a standard date when stored as text:

```sql
SELECT id, date_string
FROM orders
WHERE STR_TO_DATE(date_string, '%Y-%m-%d') IS NULL
  AND date_string IS NOT NULL;
```

Check what formats exist:

```sql
SELECT
  CASE
    WHEN date_string REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 'YYYY-MM-DD'
    WHEN date_string REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 'MM/DD/YYYY'
    WHEN date_string REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN 'DD-MM-YYYY'
    ELSE 'unknown'
  END AS format_detected,
  COUNT(*) AS cnt
FROM orders
GROUP BY format_detected;
```

## Converting Mixed Formats to a Single Standard

Use `STR_TO_DATE` with the correct format string for each variant. First add a column to hold the converted values:

```sql
ALTER TABLE orders ADD COLUMN order_date_clean DATE;
```

Then convert each format:

```sql
-- Convert MM/DD/YYYY to DATE
UPDATE orders
SET order_date_clean = STR_TO_DATE(date_string, '%m/%d/%Y')
WHERE date_string REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$';

-- Convert DD-MM-YYYY to DATE
UPDATE orders
SET order_date_clean = STR_TO_DATE(date_string, '%d-%m-%Y')
WHERE date_string REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$';

-- Already YYYY-MM-DD
UPDATE orders
SET order_date_clean = STR_TO_DATE(date_string, '%Y-%m-%d')
WHERE date_string REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
```

## Migrating a Text Column to DATE

Add a new `DATE` column, populate it, then drop the old string column:

```sql
-- Step 1: Add the proper column
ALTER TABLE orders ADD COLUMN order_date DATE;

-- Step 2: Populate from the clean values
UPDATE orders SET order_date = order_date_clean WHERE order_date_clean IS NOT NULL;

-- Step 3: Verify no nulls remain
SELECT COUNT(*) FROM orders WHERE order_date IS NULL;

-- Step 4: Drop the old string column
ALTER TABLE orders DROP COLUMN date_string;
ALTER TABLE orders DROP COLUMN order_date_clean;
```

## Formatting Dates for Output

Use `DATE_FORMAT` to display dates in any desired format without changing the stored value:

```sql
SELECT
  id,
  DATE_FORMAT(order_date, '%d %b %Y') AS display_date,   -- 15 Jan 2025
  DATE_FORMAT(order_date, '%Y/%m/%d') AS iso_slash,       -- 2025/01/15
  DATE_FORMAT(order_date, '%m-%d-%Y') AS us_format        -- 01-15-2025
FROM orders;
```

## Handling Invalid Dates

Enable strict mode to reject invalid dates at insert time:

```sql
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO';
```

Find and null out invalid dates already stored:

```sql
UPDATE orders
SET order_date = NULL
WHERE order_date = '0000-00-00';
```

## Summary

Standardize date formats in MySQL by first auditing what formats exist using regex pattern matching, then converting each variant with `STR_TO_DATE`. Migrate string columns to native `DATE` or `DATETIME` columns using `ALTER TABLE`. Use `DATE_FORMAT` for display formatting and enable strict SQL mode to prevent invalid dates from being inserted in future.
