# How to Convert Data Types in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, Type Conversion, CAST, CONVERT

Description: Learn how to convert between data types in MySQL using CAST, CONVERT, and implicit coercion, with examples for numbers, strings, dates, and JSON.

---

## Data Type Conversion in MySQL

MySQL supports both implicit (automatic) and explicit type conversion. Explicit conversion with `CAST()` or `CONVERT()` is preferred because it is predictable and communicates intent clearly.

## Implicit Type Conversion

MySQL automatically converts types in comparisons and arithmetic:

```sql
-- String to number (implicit)
SELECT '10' + 5;           -- Output: 15
SELECT '10abc' + 5;        -- Output: 15 (stops at 'abc')
SELECT 'abc' + 5;          -- Output: 5  (non-numeric string = 0)

-- Number to string (implicit in CONCAT)
SELECT CONCAT('ID: ', 42); -- Output: ID: 42
```

Implicit conversion can cause unexpected results - always prefer explicit casting.

## String to Number

```sql
SELECT CAST('42' AS SIGNED);
SELECT CAST('3.14' AS DECIMAL(10, 4));
SELECT CAST('42' AS UNSIGNED);

-- In queries
SELECT * FROM orders WHERE CAST(order_code AS UNSIGNED) > 1000;
```

## Number to String

```sql
SELECT CAST(42 AS CHAR);
SELECT CAST(3.14159 AS CHAR);
SELECT CAST(salary AS CHAR(10)) FROM employees;

-- Alternative: use CONCAT to force string context
SELECT CONCAT('', salary) FROM employees;
```

## String to Date/Time

```sql
SELECT CAST('2026-03-31' AS DATE);
SELECT CAST('2026-03-31 14:30:00' AS DATETIME);
SELECT CAST('14:30:00' AS TIME);

-- STR_TO_DATE for custom formats
SELECT STR_TO_DATE('31/03/2026', '%d/%m/%Y') AS formatted_date;
SELECT STR_TO_DATE('March 31, 2026', '%M %d, %Y');
```

## Date/Time to String

```sql
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') AS date_str;
SELECT DATE_FORMAT(NOW(), '%d/%m/%Y %H:%i:%s') AS formatted;
SELECT CAST(NOW() AS CHAR) AS datetime_string;
```

## Number to Date

```sql
-- Integer in YYYYMMDD format to DATE
SELECT STR_TO_DATE(CAST(20260331 AS CHAR), '%Y%m%d') AS date_val;

-- Unix timestamp to datetime
SELECT FROM_UNIXTIME(1774915200) AS datetime_val;

-- Datetime to Unix timestamp
SELECT UNIX_TIMESTAMP('2026-03-31 00:00:00') AS unix_ts;
```

## Float to Integer (Rounding and Truncation)

```sql
SELECT CAST(9.9 AS SIGNED);         -- Output: 10 (rounds)
SELECT TRUNCATE(9.9, 0);            -- Output: 9  (truncates)
SELECT FLOOR(9.9);                  -- Output: 9
SELECT CEIL(9.1);                   -- Output: 10
SELECT ROUND(9.5);                  -- Output: 10
```

## Integer/Float Precision Conversion

```sql
SELECT CAST(price AS DECIMAL(10, 2)) FROM products;

-- Double to float (less precision)
SELECT CAST(3.14159265358979 AS FLOAT);  -- Output: 3.141593 (7 digits)
SELECT CAST(3.14159265358979 AS DOUBLE); -- Output: 3.14159265358979
```

## String to JSON

```sql
SELECT CAST('{"name": "Alice", "age": 30}' AS JSON);

-- Validate JSON
SELECT JSON_VALID('{"key": "value"}');
```

## JSON to String

```sql
SELECT CAST(JSON_OBJECT('name', 'Alice') AS CHAR);
-- Output: {"name": "Alice"}
```

## Character Set Conversion

```sql
-- Convert latin1 to utf8mb4
SELECT CONVERT(description USING utf8mb4) FROM legacy_table;

-- Check column charset
SELECT character_set_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'description';
```

## Binary Conversion

```sql
-- String to binary (strips character set info)
SELECT CAST('hello' AS BINARY);
SELECT HEX(CAST('hello' AS BINARY));  -- Output: 68656C6C6F

-- Binary to string
SELECT CONVERT(binary_col USING utf8mb4) FROM data_table;
```

## Summary

MySQL type conversion uses `CAST(value AS type)` or `CONVERT(value, type)` for explicit conversions. Use `STR_TO_DATE()` for non-standard date formats, `DATE_FORMAT()` for date-to-string formatting, `FROM_UNIXTIME()` for Unix timestamps, and `CONVERT(value USING charset)` for character set changes. Avoid relying on implicit conversion as it can produce silent data corruption or unexpected results.
