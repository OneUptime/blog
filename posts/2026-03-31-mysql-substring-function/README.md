# How to Use SUBSTRING() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how to use MySQL's SUBSTRING() function to extract a portion of a string by position and length, with practical query examples.

---

## What is SUBSTRING()?

The `SUBSTRING()` function in MySQL extracts a part of a string starting from a specified position. It is also available under the aliases `SUBSTR()` and `MID()`. This function is essential when you need to parse fixed-format strings, extract prefixes or suffixes, or slice stored codes.

The syntax has two forms:

```sql
SUBSTRING(str, pos)
SUBSTRING(str, pos, len)
```

- `pos` - the starting position (1-based). Negative values count from the end.
- `len` - the number of characters to return (optional; if omitted, returns to the end).

## Basic Examples

```sql
SELECT SUBSTRING('Hello, World!', 1, 5);
-- Result: Hello

SELECT SUBSTRING('Hello, World!', 8);
-- Result: World!

SELECT SUBSTRING('Hello, World!', -6);
-- Result: World!
```

## Using SUBSTRING() on Table Columns

A common use case is extracting a structured code segment from a column:

```sql
SELECT
  order_code,
  SUBSTRING(order_code, 1, 3) AS region_prefix,
  SUBSTRING(order_code, 4) AS order_number
FROM orders;
```

For a code like `US-00123`, this extracts `US-` and `00123` separately.

## Extracting File Extensions

```sql
SELECT
  filename,
  SUBSTRING(filename, LOCATE('.', filename) + 1) AS extension
FROM uploaded_files;
```

This dynamically finds the dot position and extracts everything after it.

## Using Negative Position

A negative position counts characters from the end of the string:

```sql
SELECT SUBSTRING('report_2024_q4.csv', -3);
-- Result: csv

SELECT SUBSTRING('user_profile_image.png', -9, 3);
-- Result: ima
```

## SUBSTRING() in WHERE Clause

```sql
SELECT *
FROM products
WHERE SUBSTRING(sku, 1, 2) = 'LT';
```

This filters all SKUs starting with `LT`. Be aware this prevents index use on the `sku` column.

## SUBSTRING() with UPDATE

You can reassemble a string after extracting parts:

```sql
UPDATE users
SET username = CONCAT(SUBSTRING(username, 1, 8), '_legacy')
WHERE created_at < '2020-01-01';
```

## Using SUBSTR() and MID() Aliases

All three are equivalent:

```sql
SELECT SUBSTR('database', 5);       -- base
SELECT MID('database', 1, 4);       -- data
SELECT SUBSTRING('database', 5, 4); -- base
```

## Combining with LENGTH()

To extract the last N characters dynamically:

```sql
SELECT
  description,
  SUBSTRING(description, LENGTH(description) - 9) AS last_10_chars
FROM articles;
```

## Practical Example - Masking Credit Card Numbers

```sql
SELECT
  CONCAT(
    REPEAT('*', LENGTH(card_number) - 4),
    SUBSTRING(card_number, -4)
  ) AS masked_card
FROM payment_methods;
```

This masks all but the last 4 digits using `REPEAT()` and `SUBSTRING()` together.

## Summary

`SUBSTRING()` (also `SUBSTR()` / `MID()`) extracts a slice of a string by start position and optional length. Positions are 1-based; negative positions count from the end. It is widely used for parsing codes, extracting file extensions, masking sensitive data, and filtering by string prefixes. Combine it with `LOCATE()`, `LENGTH()`, and `CONCAT()` for more complex string manipulation without needing application-layer parsing.
