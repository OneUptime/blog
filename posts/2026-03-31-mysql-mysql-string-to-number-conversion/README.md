# How to Convert a String to a Number in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Conversion, String, Number, CAST

Description: Learn how to convert string values to numeric types in MySQL using CAST(), CONVERT(), implicit conversion, and handling of non-numeric strings.

---

## Introduction

Converting strings to numbers in MySQL is a common need when working with data imported as text, JSON string values, or legacy columns stored as VARCHAR that should be numeric. MySQL offers several approaches: explicit conversion with `CAST()` and `CONVERT()`, implicit type coercion in arithmetic expressions, and functions like `FORMAT()` for cleaned string parsing.

## Implicit String-to-Number Conversion

MySQL automatically converts strings to numbers in numeric contexts:

```sql
-- Arithmetic forces string-to-number conversion
SELECT '42' + 0;       -- Returns: 42
SELECT '3.14' + 0;     -- Returns: 3.14
SELECT '10px' + 0;     -- Returns: 10 (stops at first non-numeric char)
SELECT 'abc' + 0;      -- Returns: 0 (no leading numeric chars)

-- Comparison
SELECT '100' > 99;     -- Returns: 1 (true) - string coerced to number
```

While implicit conversion works, explicit conversion is clearer and avoids surprises.

## Using CAST()

```sql
CAST(expr AS type)
```

Supported numeric target types:
- `SIGNED` - 64-bit signed integer
- `UNSIGNED` - 64-bit unsigned integer
- `DECIMAL(M,D)` - fixed-point decimal
- `FLOAT` - single-precision float (MySQL 8.0.17+)
- `DOUBLE` - double-precision float (MySQL 8.0.17+)

```sql
-- Convert string to integer
SELECT CAST('42' AS SIGNED);        -- Returns: 42
SELECT CAST('-15' AS SIGNED);       -- Returns: -15
SELECT CAST('42' AS UNSIGNED);      -- Returns: 42
SELECT CAST('-1' AS UNSIGNED);      -- Returns: 18446744073709551615 (wraps around)

-- Convert string to decimal
SELECT CAST('3.14159' AS DECIMAL(10,5));  -- Returns: 3.14159
SELECT CAST('19.99' AS DECIMAL(10,2));   -- Returns: 19.99

-- Convert string to float/double (MySQL 8.0.17+)
SELECT CAST('3.14' AS FLOAT);   -- Returns: 3.14
SELECT CAST('2.718' AS DOUBLE); -- Returns: 2.718
```

## Using CONVERT()

`CONVERT()` works the same as `CAST()` with different syntax:

```sql
SELECT CONVERT('42', SIGNED);           -- Returns: 42
SELECT CONVERT('19.99', DECIMAL(10,2)); -- Returns: 19.99
SELECT CONVERT('3.14', DOUBLE);         -- Returns: 3.14
```

## Handling Non-Numeric Strings

When a string cannot be fully converted, MySQL returns the numeric prefix (or 0):

```sql
SELECT CAST('42abc' AS SIGNED);    -- Returns: 42
SELECT CAST('abc42' AS SIGNED);    -- Returns: 0
SELECT CAST('3.14xyz' AS DECIMAL(10,2));  -- Returns: 3.14
SELECT CAST('$19.99' AS DECIMAL(10,2));   -- Returns: 0
```

To safely handle currency-formatted strings, clean them first:

```sql
-- Remove $ and commas before converting
SELECT CAST(REPLACE(REPLACE('$1,234.56', '$', ''), ',', '') AS DECIMAL(10,2));
-- Returns: 1234.56
```

## Bulk Conversion in a Table

When importing data where a column is incorrectly stored as VARCHAR:

```sql
-- Check for non-numeric values before converting
SELECT id, amount_str
FROM orders
WHERE amount_str REGEXP '[^0-9.]'  -- contains non-numeric chars
   OR amount_str = '';

-- Convert and store in a proper numeric column
ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2);

UPDATE orders
SET amount = CAST(REPLACE(REPLACE(amount_str, '$', ''), ',', '') AS DECIMAL(10,2))
WHERE amount_str IS NOT NULL;
```

## Converting in WHERE Clauses

Avoid converting in WHERE clauses when possible, as it prevents index use:

```sql
-- This prevents index use on numeric_column
SELECT * FROM t WHERE CAST(numeric_column AS CHAR) = '42';

-- This is index-friendly
SELECT * FROM t WHERE numeric_column = 42;

-- When you must compare a number stored as string:
SELECT * FROM t WHERE CAST(varchar_column AS SIGNED) = 42;
```

## Using FORMAT() for Parsing

`FORMAT()` formats numbers, but does not parse strings. For cleaned numeric output:

```sql
-- Format a number as a string with commas
SELECT FORMAT(1234567.89, 2);  -- Returns: 1,234,567.89
```

## Converting JSON String Numbers

```sql
-- Extract and convert JSON numeric strings
SELECT CAST(JSON_EXTRACT('{"price": "19.99"}', '$.price') AS DECIMAL(10,2));
-- Returns: 19.99
```

## Summary

Use `CAST(str AS SIGNED)` for integer conversion, `CAST(str AS DECIMAL(M,D))` for fixed-point decimal, and `CAST(str AS DOUBLE)` for floating-point. Clean strings of non-numeric characters (currency symbols, commas) before converting. Avoid implicit conversion in production code - be explicit about type conversions to make intent clear and prevent unexpected results from partially-numeric strings.
