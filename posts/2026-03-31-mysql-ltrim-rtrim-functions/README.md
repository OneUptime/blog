# How to Use LTRIM() and RTRIM() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how LTRIM() and RTRIM() remove leading and trailing spaces from strings in MySQL, when to use them versus TRIM(), and practical data-cleaning use cases.

---

`LTRIM()` removes leading (left-side) spaces from a string. `RTRIM()` removes trailing (right-side) spaces. Both work only with space characters; for custom characters use `TRIM()`.

## Syntax

```sql
LTRIM(str)
RTRIM(str)
```

Returns `NULL` if `str` is `NULL`.

## Basic usage

```sql
SELECT LTRIM('   Hello World');    -- 'Hello World'
SELECT RTRIM('Hello World   ');    -- 'Hello World'

SELECT LTRIM('   MySQL   ');       -- 'MySQL   '
SELECT RTRIM('   MySQL   ');       -- '   MySQL'
```

## Combined: emulate TRIM()

```sql
SELECT LTRIM(RTRIM('   Hello World   '));  -- 'Hello World'
-- Equivalent to TRIM('   Hello World   ')
```

## Comparing to TRIM()

```sql
-- TRIM() removes both sides in one call
SELECT TRIM('   Hello   ');    -- 'Hello'

-- LTRIM removes left only
SELECT LTRIM('   Hello   ');   -- 'Hello   '

-- RTRIM removes right only
SELECT RTRIM('   Hello   ');   -- '   Hello'

-- LTRIM and RTRIM cannot remove custom characters (only spaces)
SELECT LTRIM('---Hello---');   -- '---Hello---' (no change)

-- TRIM can remove custom characters
SELECT TRIM('-' FROM '---Hello---');  -- 'Hello'
```

## Cleaning imported data

Data imported from CSV or spreadsheets often has leading or trailing spaces:

```sql
CREATE TABLE imported_products (
    product_id INT PRIMARY KEY,
    name       VARCHAR(100),
    sku        VARCHAR(30)
);

INSERT INTO imported_products VALUES
(1, '  Widget Pro  ', '  SKU-001  '),
(2, 'Gadget',         'SKU-002    '),
(3, '  Doohickey',    'SKU-003');

SELECT
    product_id,
    LTRIM(RTRIM(name)) AS clean_name,
    LTRIM(RTRIM(sku))  AS clean_sku
FROM imported_products;
```

## Updating stored data

```sql
UPDATE imported_products
SET
    name = LTRIM(RTRIM(name)),
    sku  = LTRIM(RTRIM(sku))
WHERE name != LTRIM(RTRIM(name))
   OR sku  != LTRIM(RTRIM(sku));
```

## Using RTRIM with CHAR columns

`CHAR` columns in MySQL are stored with trailing spaces to pad to the declared length. By default MySQL strips those trailing spaces on retrieval, so `LENGTH` already returns the unpadded length and `RTRIM` has no additional effect. If `PAD_CHAR_TO_FULL_LENGTH` is enabled, MySQL preserves the padding and `RTRIM` becomes useful:

```sql
CREATE TABLE codes (
    code CHAR(10)
);

INSERT INTO codes VALUES ('ABC');

-- Default behavior (trailing spaces stripped on retrieval):
SELECT code, LENGTH(code) FROM codes;
-- code: 'ABC', length: 3

-- With PAD_CHAR_TO_FULL_LENGTH enabled, padding is preserved:
SELECT code, LENGTH(code), RTRIM(code), LENGTH(RTRIM(code))
FROM codes;
-- code: 'ABC       ' (10 chars), length: 10
-- RTRIM(code): 'ABC', length: 3
```

Note: `PAD_CHAR_TO_FULL_LENGTH` was deprecated in MySQL 8.0.13 and removed in MySQL 8.4. MySQL also ignores trailing spaces when comparing `CHAR` values with `=` regardless of this setting.

## Finding rows with leading or trailing spaces

```sql
-- Rows with leading spaces
SELECT product_id, name
FROM imported_products
WHERE name LIKE ' %';

-- Rows with trailing spaces
SELECT product_id, name
FROM imported_products
WHERE name LIKE '% ';

-- Either side
SELECT product_id, name
FROM imported_products
WHERE name != LTRIM(RTRIM(name));
```

## Practical: normalise email addresses

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    email   VARCHAR(100)
);

INSERT INTO users VALUES
(1, '  alice@example.com'),
(2, 'bob@example.com   '),
(3, '  carol@example.com  ');

SELECT user_id, LTRIM(RTRIM(email)) AS email FROM users;
```

## Performance note

Wrapping a column in `LTRIM` or `RTRIM` in a `WHERE` condition disables index usage on that column. Always clean data at write time:

```sql
-- Prevents index use on email:
WHERE LTRIM(RTRIM(email)) = 'alice@example.com';

-- Preferred: store clean data, then query directly:
WHERE email = 'alice@example.com';
```

## LTRIM / RTRIM vs TRIM summary

| Function | Removes | Side | Custom char |
|---|---|---|---|
| `LTRIM(str)` | Spaces | Left | No |
| `RTRIM(str)` | Spaces | Right | No |
| `TRIM(str)` | Spaces | Both | No (default) |
| `TRIM(c FROM str)` | `c` | Both (default) | Yes |
| `TRIM(LEADING c FROM str)` | `c` | Left | Yes |
| `TRIM(TRAILING c FROM str)` | `c` | Right | Yes |

## Summary

`LTRIM()` and `RTRIM()` are focused functions for removing leading and trailing spaces respectively. Use them when you need one-sided space removal, or combine them as `LTRIM(RTRIM(str))` as a readable alternative to `TRIM()`. For removing non-space characters, switch to the full `TRIM(remstr FROM str)` syntax. Keep data clean at insert/update time so indexed columns remain searchable without wrapping in trim functions.
