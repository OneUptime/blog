# How to Use CONVERT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CONVERT, Type Conversion, Character Set, SQL Functions

Description: Learn how to use the CONVERT() function in MySQL for type conversion and character set conversion with practical examples.

---

## What is CONVERT()

MySQL's `CONVERT()` function has two forms:

1. **Type conversion**: converts a value to a specified data type
2. **Character set conversion**: converts a string to a different character set

Syntax:

```sql
-- Type conversion
CONVERT(value, type)

-- Character set conversion
CONVERT(value USING charset_name)
```

## Type Conversion with CONVERT()

`CONVERT()` for type conversion works similarly to `CAST()`:

```sql
SELECT CONVERT('42', SIGNED);           -- Output: 42
SELECT CONVERT('3.14', DECIMAL(10, 2)); -- Output: 3.14
SELECT CONVERT(42, CHAR);               -- Output: '42'
SELECT CONVERT('2026-03-31', DATE);     -- Output: 2026-03-31
SELECT CONVERT('14:30:00', TIME);       -- Output: 14:30:00
```

## Supported Types for CONVERT()

```sql
CONVERT(value, BINARY)
CONVERT(value, CHAR)
CONVERT(value, DATE)
CONVERT(value, DATETIME)
CONVERT(value, DECIMAL)
CONVERT(value, SIGNED)
CONVERT(value, TIME)
CONVERT(value, UNSIGNED)
```

## Character Set Conversion with USING

The `USING` form is the unique feature of `CONVERT()` that `CAST()` does not support:

```sql
-- Convert a string to utf8mb4
SELECT CONVERT(name USING utf8mb4) FROM employees;

-- Convert from latin1 to utf8mb4
SELECT CONVERT(description USING utf8mb4) FROM legacy_products;

-- Convert to ASCII (replaces non-ASCII chars with '?')
SELECT CONVERT(notes USING ascii) FROM records;
```

## Changing Character Set for Comparisons

Character set conversions are useful for cross-charset comparisons:

```sql
-- Compare a utf8 column with a utf8mb4 string
SELECT * FROM users
WHERE CONVERT(username USING utf8mb4) = '😀user';
```

## CONVERT() in Data Migration

When migrating data between character sets:

```sql
-- Convert column data to utf8mb4 in a new table
INSERT INTO new_table (id, description)
SELECT id, CONVERT(description USING utf8mb4)
FROM old_table;
```

## CONVERT() vs CAST()

```sql
-- Both do the same type conversion
SELECT CAST('123' AS SIGNED);
SELECT CONVERT('123', SIGNED);

-- Only CONVERT supports character set conversion
SELECT CONVERT(name USING utf8mb4) FROM users;
-- CAST has no equivalent for this

-- CAST uses AS keyword, CONVERT uses comma
SELECT CAST(price AS DECIMAL(10, 2));
SELECT CONVERT(price, DECIMAL(10, 2));
```

## Converting BLOB to Text

```sql
-- A BLOB column can be read as UTF-8 text
SELECT CONVERT(binary_data USING utf8mb4) AS text_data
FROM blob_storage;
```

## CONVERT() for String Truncation

```sql
-- CONVERT with CHAR length truncates to the specified length
SELECT CONVERT('Hello World', CHAR(5));  -- Output: Hello
```

## Practical Use Case - Normalizing Phone Numbers

```sql
-- Strip non-numeric chars and cast to text
SELECT
  CONVERT(REGEXP_REPLACE(phone, '[^0-9]', ''), CHAR) AS clean_phone
FROM contacts;
```

## Sorting Numeric Strings

```sql
SELECT order_number, total
FROM orders
ORDER BY CONVERT(order_number, UNSIGNED);
```

## Summary

`CONVERT()` in MySQL serves two purposes: data type conversion (similar to `CAST()`) and character set conversion using the `USING` syntax. Use `CONVERT(value, type)` for type changes and `CONVERT(value USING charset)` for encoding changes. The `USING` form is especially useful when migrating legacy data to `utf8mb4` or when cross-charset comparisons are needed.
