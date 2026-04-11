# How to Use REPLACE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how REPLACE() substitutes all occurrences of a substring within a string in MySQL, with practical examples for data cleaning, URL normalisation, and content updates.

---

`REPLACE(str, from_str, to_str)` returns a copy of `str` with every occurrence of `from_str` replaced by `to_str`. The search is case-sensitive.

## Syntax

```sql
REPLACE(str, from_str, to_str)
```

- `str` - the original string or column.
- `from_str` - the substring to find.
- `to_str` - the replacement string. Use `''` to delete occurrences.
- If any argument is `NULL`, the result is `NULL`.
- All occurrences are replaced, not just the first.

## Basic usage

```sql
SELECT REPLACE('Hello World', 'World', 'MySQL');
-- 'Hello MySQL'

SELECT REPLACE('aabbcc', 'b', 'X');
-- 'aaXXcc'  (both b's replaced)

SELECT REPLACE('foo/bar/baz', '/', '-');
-- 'foo-bar-baz'
```

## Deleting a substring by replacing with empty string

```sql
SELECT REPLACE('Hello   World', ' ', '');
-- 'HelloWorld'  (removes all spaces)

SELECT REPLACE('$1,234.56', ',', '');
-- '$1234.56'  (remove thousands separator)
```

## Case sensitivity

```sql
SELECT REPLACE('Hello HELLO hello', 'hello', 'Hi');
-- 'Hello HELLO Hi'  (only lowercase 'hello' matched)
```

`REPLACE` is always case-sensitive. For case-insensitive replacement, convert to a uniform case first or use a `REGEXP_REPLACE` with the `(?i)` flag:

```sql
-- Case-insensitive replacement using REGEXP_REPLACE (MySQL 8+)
SELECT REGEXP_REPLACE('Hello HELLO hello', '(?i)hello', 'Hi');
-- 'Hi Hi Hi'
```

## Updating data in a table

```sql
CREATE TABLE articles (
    article_id INT PRIMARY KEY,
    body       TEXT
);

-- Replace a deprecated domain in all article bodies
UPDATE articles
SET body = REPLACE(body, 'http://old-domain.com', 'https://new-domain.com')
WHERE body LIKE '%http://old-domain.com%';
```

## Removing unwanted characters

```sql
CREATE TABLE phone_numbers (
    contact_id INT PRIMARY KEY,
    phone      VARCHAR(30)
);

INSERT INTO phone_numbers VALUES
(1, '(555) 123-4567'),
(2, '+1-800-555-0100'),
(3, '555.987.6543');

-- Strip all non-numeric characters (chained REPLACE)
SELECT
    contact_id,
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), '.', ''), ' ', ''), '+', '') AS digits_only
FROM phone_numbers;
```

For complex character removal in MySQL 8, `REGEXP_REPLACE` is cleaner:

```sql
SELECT contact_id, REGEXP_REPLACE(phone, '[^0-9]', '') AS digits_only
FROM phone_numbers;
```

## Generating slugs

```sql
SELECT LOWER(REPLACE(title, ' ', '-')) AS slug
FROM articles;
-- 'How to Use REPLACE in MySQL' -> 'how-to-use-replace-in-mysql'
```

## Sanitising stored HTML

```sql
UPDATE articles
SET body = REPLACE(body, '<br>', '<br/>')
WHERE body LIKE '%<br>%';
```

## Replacing line endings

```sql
-- Normalise Windows CRLF to Unix LF
SELECT REPLACE(content, '\r\n', '\n') FROM text_files;

-- Remove all newlines
SELECT REPLACE(REPLACE(content, '\r\n', ' '), '\n', ' ') FROM text_files;
```

## Chaining REPLACE calls

```sql
-- Replace multiple patterns by nesting
SELECT REPLACE(REPLACE(REPLACE('one, two; three: four', ',', ''), ';', ''), ':', '') AS clean;
-- 'one two three four'
```

## REPLACE vs REGEXP_REPLACE

| Feature | REPLACE | REGEXP_REPLACE |
|---|---|---|
| Pattern type | Literal string | Regular expression |
| Case sensitivity | Always case-sensitive | Configurable |
| Performance | Fast | Slower |
| MySQL version | All | MySQL 8.0+ |

## Summary

`REPLACE(str, from_str, to_str)` replaces all occurrences of `from_str` in `str` with `to_str`. It is the right tool for straightforward literal substitutions such as fixing URLs, removing punctuation, and normalising separators. The search is case-sensitive. For case-insensitive or pattern-based replacement, use `REGEXP_REPLACE` in MySQL 8. Chain multiple `REPLACE` calls to remove several different substrings in one expression.
