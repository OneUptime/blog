# How to Use ASCII() and CHAR() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Character Encoding, Database

Description: Learn how to use MySQL ASCII() to get the numeric code of a character and CHAR() to convert numeric codes back to characters.

---

## Overview

`ASCII()` and `CHAR()` are complementary MySQL functions that convert between characters and their numeric ASCII (or Unicode) codes. They are useful for character validation, encoding manipulation, building character ranges, and bypassing string quoting in dynamic SQL.

---

## ASCII() Function

`ASCII()` returns the numeric ASCII code value of the leftmost character of a string.

**Syntax:**

```sql
ASCII(str)
```

- Returns an integer between 0 and 255.
- Returns `NULL` if `str` is `NULL`.
- Returns `0` if `str` is an empty string.
- Only evaluates the first character; the rest of the string is ignored.

### Basic Examples

```sql
SELECT ASCII('A');
-- Returns: 65

SELECT ASCII('a');
-- Returns: 97

SELECT ASCII('Z');
-- Returns: 90

SELECT ASCII('0');
-- Returns: 48

SELECT ASCII(' ');
-- Returns: 32

SELECT ASCII('Hello');
-- Returns: 72  (only 'H' is evaluated)

SELECT ASCII('');
-- Returns: 0

SELECT ASCII(NULL);
-- Returns: NULL
```

---

## CHAR() Function

`CHAR()` takes one or more integer values and returns the string formed by the corresponding ASCII (or Unicode) characters.

**Syntax:**

```sql
CHAR(N, ... [USING charset_name])
```

- Each `N` is an integer interpreted as a character code.
- Values outside the 0-255 range are handled as multi-byte characters when a charset is specified.
- `NULL` values in the list are silently ignored.
- The optional `USING charset_name` clause specifies the character set (e.g., `utf8mb4`).

### Basic Examples

```sql
SELECT CHAR(65);
-- Returns: 'A'

SELECT CHAR(97);
-- Returns: 'a'

SELECT CHAR(72, 101, 108, 108, 111);
-- Returns: 'Hello'

SELECT CHAR(77, 121, 83, 81, 76);
-- Returns: 'MySQL'

SELECT CHAR(NULL, 65, NULL, 66);
-- Returns: 'AB'  (NULLs ignored)
```

---

## How ASCII() and CHAR() Relate

```mermaid
flowchart LR
    A[Character 'A'] -->|ASCII()| B[Integer 65]
    B -->|CHAR()| C[Character 'A']
```

They are inverse functions of each other for standard ASCII characters (0-127).

---

## ASCII Code Reference for Common Characters

| Character | ASCII Code |
|-----------|------------|
| `A`-`Z`   | 65-90      |
| `a`-`z`   | 97-122     |
| `0`-`9`   | 48-57      |
| Space     | 32         |
| `!`       | 33         |
| `@`       | 64         |
| `\n`      | 10         |
| `\t`      | 9          |

---

## Practical Use: Character Range Filtering

Validate whether a string starts with an uppercase letter:

```sql
SELECT name
FROM products
WHERE ASCII(name) BETWEEN 65 AND 90;
-- Returns rows where name starts with A-Z
```

Check for digits at the start:

```sql
SELECT username
FROM users
WHERE ASCII(username) BETWEEN 48 AND 57;
-- Returns usernames starting with a digit
```

---

## Using CHAR() to Avoid String Quoting Issues

In dynamic SQL generation, `CHAR()` can represent special characters without quoting:

```sql
-- Insert a tab-separated line
INSERT INTO log_entries (entry) VALUES (CONCAT('field1', CHAR(9), 'field2', CHAR(9), 'field3'));

-- Insert a string with a newline
INSERT INTO notes (content) VALUES (CONCAT('Line 1', CHAR(10), 'Line 2'));
```

---

## CHAR() with Multi-Byte Characters

Using the `USING utf8mb4` clause allows encoding characters beyond standard ASCII:

```sql
SELECT CHAR(0x00e9 USING utf8mb4);
-- Returns: 'e' with acute accent (e with accent)

SELECT CHAR(9786 USING utf8mb4);
-- Returns: smiley face character (U+263A)
```

---

## Case Conversion Using ASCII()

```sql
-- Convert lowercase to uppercase by subtracting 32
SELECT CHAR(ASCII('b') - 32);
-- Returns: 'B'

-- Convert uppercase to lowercase by adding 32
SELECT CHAR(ASCII('M') + 32);
-- Returns: 'm'
```

Note: MySQL's built-in `UPPER()` and `LOWER()` are simpler for this purpose, but this illustrates how ASCII arithmetic works.

---

## Generating Alphabetical Sequences

```sql
-- Generate A through E
SELECT CHAR(64 + n) AS letter
FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) t;
```

Result:

| letter |
|--------|
| A      |
| B      |
| C      |
| D      |
| E      |

---

## Validating Input Characters

```sql
-- Check if the first character of a column value is a printable ASCII character (32-126)
SELECT
    id,
    value,
    CASE
        WHEN ASCII(value) >= 32 AND ASCII(value) <= 126 THEN 'Printable'
        ELSE 'Non-printable or empty'
    END AS char_type
FROM data_table;
```

---

## ASCII() vs ORD()

`ORD()` is similar to `ASCII()` but handles multi-byte characters differently. For single-byte characters, both return the same value. For multi-byte characters, `ORD()` returns a numeric value computed from the constituent bytes using the formula: `(1st byte) + (2nd byte × 256) + (3rd byte × 256²) + ...`

```sql
SELECT ASCII('A');    -- 65
SELECT ORD('A');      -- 65

-- For multi-byte characters (e.g., 'é' encoded as 0xC3 0xA9 in UTF-8):
SELECT ASCII('é');    -- 195 (first byte only, 0xC3)
SELECT ORD('é');      -- 43459 (195 + 169 * 256)
```

Use `ORD()` when you need a unique numeric identifier for multi-byte characters and `ASCII()` when working strictly with single-byte ASCII.

---

## Summary

`ASCII()` and `CHAR()` are foundational MySQL string utilities that bridge characters and their numeric codes. `ASCII()` extracts the code of the first character of a string, while `CHAR()` assembles a string from a list of integer codes. They are useful for character range filtering, encoding special characters in dynamic SQL, custom case conversion arithmetic, and working with binary or non-printable characters. For multi-byte character sets, prefer `ORD()` over `ASCII()`.
