# How to Use UPPER() and LOWER() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how UPPER() and LOWER() convert strings to uppercase and lowercase in MySQL, how they work with multibyte characters, and when to use them for case-insensitive comparisons.

---

`UPPER(str)` converts all characters in `str` to uppercase. `LOWER(str)` converts all characters to lowercase. Both are essential for normalising string data, formatting output, and performing case-insensitive comparisons.

## Syntax

```sql
UPPER(str)
UCASE(str)   -- alias for UPPER

LOWER(str)
LCASE(str)   -- alias for LOWER
```

Returns `NULL` if `str` is `NULL`.

## Basic usage

```sql
SELECT UPPER('hello world');   -- 'HELLO WORLD'
SELECT LOWER('HELLO WORLD');   -- 'hello world'

SELECT UPPER('MySQL 8.0');     -- 'MYSQL 8.0'
SELECT LOWER('MySQL 8.0');     -- 'mysql 8.0'
```

## Converting stored data

```sql
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100),
    email       VARCHAR(100)
);

INSERT INTO customers VALUES
(1, 'alice johnson', 'Alice@Example.COM'),
(2, 'BOB SMITH',     'bob@EXAMPLE.com');

SELECT
    customer_id,
    CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name, 2))) AS formatted_name,  -- Title case attempt
    LOWER(email) AS normalised_email
FROM customers;
```

## Title case (first letter uppercase, rest lowercase)

MySQL has no built-in title case function. Use a combination:

```sql
SELECT
    CONCAT(
        UPPER(LEFT(name, 1)),
        LOWER(SUBSTRING(name, 2))
    ) AS title_case
FROM customers;
-- 'alice johnson' -> 'Alice johnson'
```

For multi-word title case, a stored function or application-side logic is more practical.

## Case-insensitive comparison

MySQL string comparisons are already case-insensitive by default for `utf8mb4_0900_ai_ci` (the default collation). However, when using a case-sensitive collation, you can force case-insensitive comparison with `LOWER` or `UPPER`:

```sql
-- Case-sensitive collation: these would not match without LOWER
SELECT * FROM customers WHERE LOWER(email) = LOWER('ALICE@EXAMPLE.COM');

-- With default case-insensitive collation, this also works:
SELECT * FROM customers WHERE email = 'ALICE@EXAMPLE.COM';
```

For portability and clarity, normalising to lowercase before storage is the recommended approach.

## Normalising data at insert time

```sql
INSERT INTO customers (customer_id, name, email)
VALUES (3, LOWER('CAROL  Jones'), LOWER('Carol@EXAMPLE.COM'));
```

## Using UPPER / LOWER in WHERE (index implications)

Wrapping a column in `UPPER` or `LOWER` prevents index usage:

```sql
-- Index on email cannot be used:
WHERE LOWER(email) = 'alice@example.com';

-- Preferred: store emails in lowercase, then compare directly:
WHERE email = 'alice@example.com';
```

If you must search case-insensitively on a case-sensitive column, create a functional index in MySQL 8:

```sql
CREATE INDEX idx_email_lower ON customers ((LOWER(email)));

-- Now this query uses the functional index:
SELECT * FROM customers WHERE LOWER(email) = 'alice@example.com';
```

## Multibyte character support

`UPPER` and `LOWER` work correctly with Unicode characters in `utf8mb4`:

```sql
SELECT UPPER('café');      -- 'CAFÉ'
SELECT LOWER('MÜNCHEN');   -- 'münchen'
```

Note that MySQL's `UPPER()` uses simple (one-to-one) case mapping, so it does not expand `ß` to `SS`. For languages with context-dependent casing rules (Turkish dotted/dotless I), MySQL follows Unicode rules based on the collation. Use `utf8mb4_tr_0900_ai_ci` for Turkish.

## Combining with other string functions

```sql
-- Normalise and trim an email for storage
SELECT LOWER(TRIM(email)) AS clean_email FROM form_submissions;

-- Generate a username from a full name
SELECT LOWER(REPLACE(name, ' ', '.')) AS username FROM customers;
-- 'Alice Johnson' -> 'alice.johnson'
```

## Generating slugs

```sql
SELECT LOWER(REPLACE(REPLACE(title, ' ', '-'), '/', '-')) AS slug
FROM articles;
-- 'How to Use MySQL' -> 'how-to-use-mysql'
```

## Summary

`UPPER()` and `LOWER()` convert strings to all-uppercase or all-lowercase. Use `LOWER()` to normalise emails and usernames before storage, enabling fast indexed equality comparisons. For case-insensitive searches on existing case-sensitive columns in MySQL 8, create a functional index on the `LOWER()` expression. Be aware that wrapping an unindexed column in `UPPER` or `LOWER` in a `WHERE` clause forces a full table scan.
