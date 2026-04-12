# How to Use REGEXP_REPLACE() and REGEXP_SUBSTR() in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Regular Expression, REGEXP_REPLACE, REGEXP_SUBSTR, String Function

Description: Learn how to use REGEXP_REPLACE() and REGEXP_SUBSTR() in MySQL 8 to clean, extract, and transform text using regular expression patterns.

---

## Overview of Regex String Functions in MySQL 8

MySQL 8 added four powerful regex functions that use the ICU (International Components for Unicode) library:
- `REGEXP_REPLACE(str, pattern, replacement)` - replaces pattern matches in a string.
- `REGEXP_SUBSTR(str, pattern)` - extracts the first match of a pattern.
- `REGEXP_LIKE(str, pattern)` - returns 1 if the string matches the pattern.
- `REGEXP_INSTR(str, pattern)` - returns the position of the first match.

This post focuses on `REGEXP_REPLACE()` and `REGEXP_SUBSTR()`.

## REGEXP_REPLACE() - Replacing Pattern Matches

### Basic Replacement

```sql
SELECT REGEXP_REPLACE('Hello  World', '  +', ' ') AS cleaned;
-- Output: Hello World
```

### Remove All Non-Alphanumeric Characters

```sql
SELECT REGEXP_REPLACE('Ph0ne: (555) 123-4567!', '[^a-zA-Z0-9 ]', '') AS cleaned;
-- Output: Ph0ne 555 1234567
```

### Normalize Phone Numbers

```sql
SELECT REGEXP_REPLACE(phone_number, '[^0-9]', '') AS digits_only
FROM contacts;
```

### Replace Multiple Spaces with a Single Space

```sql
UPDATE products
SET description = REGEXP_REPLACE(description, ' {2,}', ' ')
WHERE description REGEXP ' {2,}';
```

### Full Signature with Position and Occurrence Parameters

```sql
REGEXP_REPLACE(str, pattern, replacement [, pos [, occurrence [, match_type]]])
```

- `pos` - starting position (1-indexed, default 1)
- `occurrence` - which match to replace (0 = all, default 0; 1 = first only, etc.)
- `match_type` - modifiers: `'c'` (case sensitive), `'i'` (case insensitive), `'m'` (multiline)

```sql
-- Replace only the second occurrence of 'cat'
SELECT REGEXP_REPLACE('cat and cat and cat', 'cat', 'dog', 1, 2) AS result;
-- Output: cat and dog and cat
```

### Case-Insensitive Replacement

```sql
SELECT REGEXP_REPLACE('Hello HELLO hello', 'hello', 'Hi', 1, 0, 'i') AS result;
-- Output: Hi Hi Hi
```

## REGEXP_SUBSTR() - Extracting Pattern Matches

### Basic Extraction

```sql
SELECT REGEXP_SUBSTR('Order #12345 placed', '[0-9]+') AS order_num;
-- Output: 12345
```

### Extract Email Addresses

```sql
SELECT REGEXP_SUBSTR(notes, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}') AS email
FROM support_tickets;
```

### Extract First Word

```sql
SELECT REGEXP_SUBSTR('MySQL 8 is fast', '^[^ ]+') AS first_word;
-- Output: MySQL
```

### Full Signature

```sql
REGEXP_SUBSTR(str, pattern [, pos [, occurrence [, match_type]]])
```

- `occurrence` - which match to return (default 1 = first)
- `match_type` - modifiers: `'c'` (case sensitive), `'i'` (case insensitive), `'m'` (multiline)

### Extract Second Number in a String

```sql
SELECT REGEXP_SUBSTR('Item 42, Ref 99', '[0-9]+', 1, 2) AS second_number;
-- Output: 99
```

### Extract a Specific Part Using Position and Occurrence

```sql
SELECT REGEXP_SUBSTR('2026-03-31', '[0-9]+', 1, 2) AS month;
-- Output: 03
```

This extracts the second numeric match from the string, which corresponds to the month.

## Practical Use Cases

### Extracting Domain Names from Email Columns

```sql
SELECT
  email,
  REGEXP_SUBSTR(email, '[^@]+$') AS domain
FROM customers;
```

### Cleaning ZIP Codes

```sql
UPDATE addresses
SET zip_code = REGEXP_REPLACE(zip_code, '[^0-9-]', '')
WHERE zip_code REGEXP '[^0-9-]';
```

### Parsing Log Lines

```sql
SELECT
  log_line,
  REGEXP_SUBSTR(log_line, '\\[ERROR\\] .+') AS error_message
FROM application_logs
WHERE log_line REGEXP '\\[ERROR\\]';
```

### Replacing HTML Tags

```sql
SELECT REGEXP_REPLACE('<p>Hello <b>World</b></p>', '<[^>]+>', '') AS plain_text;
-- Output: Hello World
```

## Summary

`REGEXP_REPLACE()` and `REGEXP_SUBSTR()` in MySQL 8 bring full ICU-powered regular expression support to string manipulation. Use `REGEXP_REPLACE()` to clean, normalize, and sanitize text data directly in SQL, and use `REGEXP_SUBSTR()` to extract specific patterns like IDs, emails, or phone numbers. The optional `pos`, `occurrence`, and `match_type` parameters give fine-grained control over which match to act on.
