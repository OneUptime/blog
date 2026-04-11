# How to Use LEFT() and RIGHT() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how LEFT() and RIGHT() extract a specified number of characters from the start or end of a string in MySQL, with examples for parsing codes, dates, and formatted data.

---

`LEFT(str, len)` returns the leftmost `len` characters of `str`. `RIGHT(str, len)` returns the rightmost `len` characters. Both are shorthand for common `SUBSTRING()` patterns.

## Syntax

```sql
LEFT(str, len)
RIGHT(str, len)
```

- `str` - the source string or column.
- `len` - number of characters to extract (positive integer).
- If `len` is greater than the string length, the entire string is returned.
- If `len` is 0 or negative, an empty string is returned.
- If either argument is `NULL`, the result is `NULL`.

## Basic examples

```sql
SELECT LEFT('Hello World', 5);   -- 'Hello'
SELECT RIGHT('Hello World', 5);  -- 'World'

SELECT LEFT('MySQL 8.0', 5);     -- 'MySQL'
SELECT RIGHT('MySQL 8.0', 3);    -- '8.0'
```

## Extracting a country code from a phone number

```sql
CREATE TABLE contacts (
    contact_id   INT PRIMARY KEY,
    phone        VARCHAR(20)   -- e.g. '+1-555-0100'
);

INSERT INTO contacts VALUES (1, '+1-555-0100'), (2, '+44-20-7946-0958'), (3, '+91-9876543210');

SELECT
    contact_id,
    phone,
    LEFT(phone, LOCATE('-', phone) - 1) AS country_code
FROM contacts;
```

## Extracting year and day from a date string

```sql
SELECT
    LEFT('2026-03-31', 4)  AS year_part,   -- '2026'
    RIGHT('2026-03-31', 2) AS day_part;    -- '31'
```

For proper date columns, use `YEAR()` and `DAY()` instead.

## Truncating long strings for display

```sql
CREATE TABLE articles (
    article_id INT PRIMARY KEY,
    title      VARCHAR(200),
    body       TEXT
);

SELECT
    article_id,
    title,
    LEFT(body, 100) AS excerpt
FROM articles;
```

## Checking a prefix or suffix

```sql
-- Find product codes starting with 'SKU-'
SELECT product_id, code
FROM products
WHERE LEFT(code, 4) = 'SKU-';

-- Find files with a .pdf extension
SELECT filename
FROM documents
WHERE RIGHT(filename, 4) = '.pdf';

-- Alternative using LIKE (note: leading wildcard still prevents index use)
SELECT filename FROM documents WHERE filename LIKE '%.pdf';
```

Note: Using `LEFT()` or `RIGHT()` on a column in a `WHERE` clause prevents index use. `LIKE` with a trailing wildcard (e.g. `LIKE 'SKU-%'`) can use an index, but `LIKE` with a leading wildcard (e.g. `LIKE '%.pdf'`) cannot.

## Extracting parts of a fixed-format code

```sql
-- Format: 'REG-DEPT-SEQ' e.g. 'US-SALES-0042'
CREATE TABLE records (
    record_id INT PRIMARY KEY,
    code      CHAR(13)
);

INSERT INTO records VALUES (1, 'US-SALES-0042'), (2, 'UK-MKTG-0017');

SELECT
    code,
    LEFT(code, 2)   AS region,      -- 'US'
    RIGHT(code, 4)  AS sequence      -- '0042'
FROM records;
```

## Combining LEFT and RIGHT

```sql
-- Extract the middle part from 'US-SALES-0042': 'SALES'
SELECT
    code,
    SUBSTRING(code, 4, 5) AS department  -- better for mid-string extracts
FROM records;
```

For mid-string extraction, `SUBSTRING()` or `SUBSTR()` is more appropriate than combining `LEFT` and `RIGHT`.

## LEFT vs SUBSTRING equivalent

```sql
-- These are identical:
SELECT LEFT('Hello World', 5);
SELECT SUBSTRING('Hello World', 1, 5);

-- These are identical:
SELECT RIGHT('Hello World', 5);
SELECT SUBSTRING('Hello World', -5);
```

`LEFT` and `RIGHT` are simply convenience shortcuts.

## Handling multibyte characters

`LEFT()` and `RIGHT()` count characters, not bytes, when using a multibyte character set like `utf8mb4`. This means they are safe for Unicode strings.

```sql
-- Works correctly with Unicode
SELECT LEFT('こんにちは世界', 3);  -- 'こんに'
SELECT RIGHT('こんにちは世界', 2); -- '世界'
```

## Summary

`LEFT(str, len)` and `RIGHT(str, len)` are concise functions for extracting a fixed number of characters from the beginning or end of a string. They are useful for parsing fixed-format codes, truncating text for display, and extracting date parts from string columns. For mid-string extraction, use `SUBSTRING()`. Avoid using `LEFT()` or `RIGHT()` on indexed columns in `WHERE` clauses as they prevent index usage; use `LIKE` instead.
