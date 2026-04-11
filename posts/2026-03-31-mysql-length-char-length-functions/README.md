# How to Use LENGTH() and CHAR_LENGTH() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn the difference between LENGTH() and CHAR_LENGTH() in MySQL, when each returns different values for multibyte characters, and how to use them for validation and filtering.

---

MySQL provides two string-length functions with an important difference:

- `LENGTH(str)` returns the length in **bytes**.
- `CHAR_LENGTH(str)` (alias: `CHARACTER_LENGTH(str)`) returns the length in **characters**.

For ASCII-only strings they return the same value. For multibyte character sets like `utf8mb4`, a single character can occupy 1 to 4 bytes, making the results diverge.

## Syntax

```sql
LENGTH(str)
CHAR_LENGTH(str)
CHARACTER_LENGTH(str)   -- alias for CHAR_LENGTH
```

All return `NULL` if `str` is `NULL`.

## Basic comparison

```sql
-- ASCII string: bytes = characters
SELECT LENGTH('Hello'), CHAR_LENGTH('Hello');
-- 5, 5

-- Japanese characters in utf8mb4 (3 bytes each)
SELECT LENGTH('こんにちは'), CHAR_LENGTH('こんにちは');
-- 15, 5

-- Emoji (4 bytes each in utf8mb4)
SELECT LENGTH('Hello 😊'), CHAR_LENGTH('Hello 😊');
-- 10, 7
```

## Checking column lengths in a table

```sql
CREATE TABLE users (
    user_id  INT PRIMARY KEY,
    username VARCHAR(30),
    bio      TEXT
) CHARACTER SET utf8mb4;

INSERT INTO users VALUES
(1, 'alice',    'Hello World'),
(2, 'tanaka',   'こんにちは世界'),
(3, 'smiley',   'Hi there!');

SELECT
    username,
    CHAR_LENGTH(bio)  AS chars,
    LENGTH(bio)       AS bytes
FROM users;
```

| username | chars | bytes |
|---|---|---|
| alice | 11 | 11 |
| tanaka | 7 | 21 |
| smiley | 9 | 9 |

## Enforcing character limits for input validation

```sql
-- Find usernames exceeding 20 characters
SELECT user_id, username
FROM users
WHERE CHAR_LENGTH(username) > 20;
```

Use `CHAR_LENGTH` (not `LENGTH`) when validating user-facing limits that users perceive in terms of visible characters.

## Filtering rows by string length

```sql
-- Find products with short names (possible data issue)
SELECT product_id, name
FROM products
WHERE CHAR_LENGTH(name) < 3;

-- Find descriptions that are too long for a summary field
SELECT article_id, LEFT(title, 50) AS title_preview
FROM articles
WHERE CHAR_LENGTH(body) > 5000;
```

## Computing storage size

`LENGTH` is useful when you need to know the actual byte footprint:

```sql
-- Estimate total storage used by a text column
SELECT
    SUM(LENGTH(bio)) AS total_bytes,
    SUM(CHAR_LENGTH(bio)) AS total_chars
FROM users;
```

## Using in ORDER BY or derived columns

```sql
-- Order by username length (shortest first)
SELECT username, CHAR_LENGTH(username) AS len
FROM users
ORDER BY len;
```

## LENGTH on binary data

For `BLOB` and `BINARY` columns, `LENGTH` returns the byte count, which is what you want since binary data has no character encoding:

```sql
SELECT LENGTH(file_data) AS file_size_bytes FROM uploads WHERE upload_id = 1;
```

`CHAR_LENGTH` on binary columns still returns bytes (since binary "characters" are bytes).

## OCTET_LENGTH: synonym for LENGTH

```sql
-- OCTET_LENGTH is an alias for LENGTH
SELECT OCTET_LENGTH('Hello');  -- 5
SELECT OCTET_LENGTH('こんにちは');  -- 15 (in utf8mb4)
```

## Summary of differences

| Function | Returns | Use when |
|---|---|---|
| `LENGTH(str)` | Bytes | Storage size, binary data, byte-level limits |
| `CHAR_LENGTH(str)` | Characters | User-visible length, form validation, UI truncation |

## Summary

Use `CHAR_LENGTH()` when you are counting visible characters for user-facing validation or display logic. Use `LENGTH()` when you need the byte count for storage estimation or working with binary data. For ASCII-only data, both return the same value, but `CHAR_LENGTH()` is the correct default for any column using a multibyte character set like `utf8mb4`.
