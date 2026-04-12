# How to Use CAST() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CAST, Type Conversion, SQL Functions

Description: Learn how to use the CAST() function in MySQL to explicitly convert values between data types with practical examples for strings, numbers, and dates.

---

## What is CAST()

MySQL's `CAST()` function converts a value from one data type to another explicitly. It is standard SQL and is preferred over implicit type coercion for clarity and correctness.

Syntax:

```sql
CAST(value AS type)
```

Supported target types:
- `CHAR` / `CHAR(n)`
- `SIGNED` (integer)
- `UNSIGNED`
- `DECIMAL(m, d)`
- `FLOAT` / `DOUBLE` (MySQL 8.0.17+)
- `DATE`
- `DATETIME`
- `TIME`
- `BINARY`
- `JSON` (MySQL 5.7.8+)

## Casting to Integers

```sql
SELECT CAST('42' AS SIGNED);         -- Output: 42
SELECT CAST('42.99' AS SIGNED);      -- Output: 43 (rounded)
SELECT CAST('-15' AS SIGNED);        -- Output: -15
SELECT CAST('abc' AS SIGNED);        -- Output: 0  (non-numeric string)
SELECT CAST('99' AS UNSIGNED);       -- Output: 99
SELECT CAST(-1 AS UNSIGNED);         -- Output: 18446744073709551615 (wraps)
```

## Casting to Decimal

```sql
SELECT CAST('3.14159' AS DECIMAL(10, 2));  -- Output: 3.14
SELECT CAST(price AS DECIMAL(10, 2)) FROM products;
```

## Casting to String

```sql
SELECT CAST(12345 AS CHAR);           -- Output: '12345'
SELECT CAST(3.14 AS CHAR);            -- Output: '3.14'
SELECT CAST(NOW() AS CHAR);           -- Output: '2026-03-31 12:00:00'
SELECT CAST(salary AS CHAR(10)) FROM employees;
```

## Casting to Date and Time Types

```sql
SELECT CAST('2026-03-31' AS DATE);             -- Output: 2026-03-31
SELECT CAST('2026-03-31 14:30:00' AS DATETIME);-- Output: 2026-03-31 14:30:00
SELECT CAST('14:30:00' AS TIME);               -- Output: 14:30:00

-- Parsing a datetime string stored as VARCHAR
SELECT CAST(created_at_str AS DATETIME)
FROM event_log
WHERE CAST(created_at_str AS DATETIME) > '2026-01-01';
```

## CAST() in ORDER BY

Sorting string columns that contain numbers requires casting:

```sql
-- Wrong: lexicographic sort  -> 1, 10, 11, 2, 20, ...
SELECT id FROM items ORDER BY id;

-- Correct: numeric sort -> 1, 2, 10, 11, 20, ...
SELECT invoice_number FROM invoices
ORDER BY CAST(invoice_number AS UNSIGNED);
```

## CAST() in Comparisons

MySQL does implicit type coercion in comparisons, but being explicit avoids surprises:

```sql
-- Explicit casting for clarity
SELECT * FROM orders
WHERE CAST(order_date AS DATE) = '2026-03-31';

-- Compare numeric string to number
SELECT * FROM logs
WHERE CAST(status_code AS SIGNED) >= 400;
```

## CAST() vs CONVERT()

Both functions perform type conversion. The difference is syntax:

```sql
-- CAST: standard SQL
SELECT CAST('2026-03-31' AS DATE);

-- CONVERT: MySQL-specific, also supports character set conversion
SELECT CONVERT('2026-03-31', DATE);
SELECT CONVERT(name USING utf8mb4) FROM employees;
```

Use `CAST()` for type conversion and `CONVERT()` when you need character set conversion.

## CAST() with JSON (MySQL 5.7+)

```sql
SELECT CAST('{"key": "value"}' AS JSON);

-- Extract and cast a JSON value
SELECT CAST(JSON_EXTRACT(data, '$.price') AS DECIMAL(10, 2)) AS price
FROM products;
```

## Practical Use Case - Calculating Age

```sql
SELECT
  name,
  birth_date,
  CAST(DATEDIFF(NOW(), birth_date) / 365 AS SIGNED) AS age
FROM employees;
```

## Summary

`CAST(value AS type)` in MySQL converts values between types explicitly. It is essential for numeric sorting of string columns, safe type comparisons, date parsing from VARCHAR, and arithmetic with mixed types. Prefer `CAST()` over implicit coercion for code clarity. Use `CONVERT(expr USING charset)` when you need to change character encoding.
