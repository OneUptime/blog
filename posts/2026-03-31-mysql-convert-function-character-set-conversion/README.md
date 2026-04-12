# How to Use the CONVERT() Function for Character Set Conversion in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CONVERT, Character Set, Function, Encoding

Description: Learn how to use MySQL's CONVERT() function to cast string values between character sets and data types in queries without altering the schema.

---

## Overview

MySQL's `CONVERT()` function serves two distinct purposes: converting a string to a different character set, and converting a value to a different data type. This post focuses on the character set conversion form, which uses the `USING` keyword.

## Syntax

```sql
CONVERT(string_value USING charset_name)
```

This returns the `string_value` re-encoded in `charset_name`. The result's collation defaults to the charset's default collation.

## Basic Examples

```sql
-- Convert a latin1 string to utf8mb4
SELECT CONVERT('Straße' USING utf8mb4);

-- Convert a utf8mb4 string to ascii (replaces non-ASCII characters with ?)
SELECT CONVERT('hello world' USING ascii);

-- Convert a column value in a query
SELECT id, CONVERT(name USING utf8mb4) AS name_utf8
FROM legacy_products;
```

## Using CONVERT() with COLLATE

Combine `CONVERT()` with `COLLATE` for full control over both encoding and comparison rules:

```sql
SELECT id, name
FROM products
WHERE CONVERT(name USING utf8mb4) COLLATE utf8mb4_unicode_ci = 'laptop';
```

## Practical Use Case - Comparing Columns with Different Encodings

When joining tables where a column in one table uses `utf8` and the other uses `utf8mb4`, use `CONVERT()` to align them:

```sql
SELECT a.id, b.description
FROM table_a a
JOIN table_b b
    ON CONVERT(a.legacy_key USING utf8mb4) = b.modern_key;
```

Without the conversion, MySQL raises an "Illegal mix of collations" error.

## Using CONVERT() for Data Type Conversion

The other form of `CONVERT()` casts a value to a different data type:

```sql
SELECT CONVERT('42', SIGNED INTEGER);       -- Returns 42
SELECT CONVERT('3.14', DECIMAL(10,2));       -- Returns 3.14
SELECT CONVERT(NOW(), DATE);                 -- Returns today's date
```

This form does not use the `USING` keyword.

## CONVERT() vs. CAST()

`CAST()` is the SQL standard equivalent for type conversion and behaves identically in most cases:

```sql
SELECT CAST('2025-01-01' AS DATE);       -- Equivalent to CONVERT('2025-01-01', DATE)
```

For character set conversion, `CONVERT(... USING ...)` is the traditional syntax. In MySQL 8.0 and later, `CAST()` also supports charset conversion via `CAST(expr AS CHAR CHARACTER SET charset_name)`.

## Limitations

- `CONVERT(expr USING ascii)` replaces characters outside the ASCII range with `?`. Use with caution on data that may contain multibyte characters.
- Inline `CONVERT()` calls on indexed columns prevent the optimizer from using the index. For performance-critical queries, alter the column to the target character set instead.

## Summary

`CONVERT(expr USING charset)` is MySQL's mechanism for re-encoding strings at query time. It is invaluable for resolving collation mismatches in joins and comparisons without requiring schema changes. Pair it with `COLLATE` for precise comparison behavior, and be aware that it bypasses indexes on the source column.
