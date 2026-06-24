# How to Use REGEXP_LIKE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, REGEXP_LIKE, Regular Expression, String Function, Pattern Matching

Description: Learn how to use the REGEXP_LIKE() function in MySQL 8.0+ to test whether a string matches a regular expression pattern with full POSIX regex support.

---

## What Is REGEXP_LIKE?

`REGEXP_LIKE(expr, pattern [, match_type])` tests whether a string matches a regular expression pattern. It returns 1 (TRUE) if the string matches, 0 (FALSE) if it does not, and NULL if either argument is NULL. It was introduced in MySQL 8.0 and uses the ICU regex engine for full Unicode support.

```sql
-- Test if a string matches a pattern
SELECT REGEXP_LIKE('Hello World', 'World');   -- Returns 1
SELECT REGEXP_LIKE('Hello World', '^Hello');  -- Returns 1
SELECT REGEXP_LIKE('Hello World', '^World');  -- Returns 0
```

## Relationship to REGEXP and RLIKE

`REGEXP_LIKE()` is the function form of the `REGEXP` and `RLIKE` operators. All three are equivalent:

```sql
-- These are all equivalent
SELECT 'hello123' REGEXP '^[a-z]+[0-9]+$';
SELECT 'hello123' RLIKE '^[a-z]+[0-9]+$';
SELECT REGEXP_LIKE('hello123', '^[a-z]+[0-9]+$');
-- All return: 1

-- REGEXP_LIKE is preferred in MySQL 8.0+ for clarity and match_type support
```

## The match_type Parameter

```sql
-- 'c' - case-sensitive (default depends on collation; with utf8mb4_0900_ai_ci, matching is case-insensitive by default)
SELECT REGEXP_LIKE('Hello', 'hello', 'c');  -- Returns 0

-- 'i' - case-insensitive
SELECT REGEXP_LIKE('Hello', 'hello', 'i');  -- Returns 1

-- 'm' - multiline mode (^ and $ match line boundaries)
SELECT REGEXP_LIKE('line1\nline2', '^line2$', 'm');  -- Returns 1

-- 'n' - . matches newline
SELECT REGEXP_LIKE('line1\nline2', 'line1.line2', 'n');  -- Returns 1

-- Combine flags
SELECT REGEXP_LIKE('Hello\nWorld', '^world$', 'im');  -- Returns 1
```

## Validation Use Cases

### Email Format Validation

```sql
-- Basic email format check
SELECT email,
       REGEXP_LIKE(email, '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$') AS is_valid
FROM users;

-- Find invalid emails
SELECT * FROM users
WHERE NOT REGEXP_LIKE(email, '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$');
```

### Phone Number Validation

```sql
-- Check for valid US phone number formats
SELECT phone,
       REGEXP_LIKE(phone, '^(\\+1[\\s-]?)?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}$') AS valid
FROM contacts;
```

### Data Type Validation

```sql
-- Check if a string is a valid integer
SELECT value, REGEXP_LIKE(value, '^-?[0-9]+$') AS is_integer
FROM imported_data;

-- Check if a string is a valid decimal number
SELECT value, REGEXP_LIKE(value, '^-?[0-9]+(\\.[0-9]+)?$') AS is_decimal
FROM imported_data;

-- Check if a string is a valid date in YYYY-MM-DD format
SELECT date_str,
       REGEXP_LIKE(date_str, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') AS is_date
FROM staging_table;
```

## Filtering Rows with REGEXP_LIKE

```sql
-- Find products whose names contain only letters and spaces
SELECT name FROM products
WHERE REGEXP_LIKE(name, '^[a-zA-Z ]+$');

-- Find descriptions that contain a URL
SELECT id, description FROM articles
WHERE REGEXP_LIKE(description, 'https?://[^ ]+');

-- Find order IDs that match a specific format (e.g., ORD-YYYY-NNNNN)
SELECT * FROM orders
WHERE REGEXP_LIKE(order_ref, '^ORD-[0-9]{4}-[0-9]{5}$');
```

## Using REGEXP_LIKE in CHECK Constraints (MySQL 8.0.16+)

```sql
-- Enforce email format at the database level
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    CONSTRAINT chk_email CHECK (
        REGEXP_LIKE(email, '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$')
    ),
    CONSTRAINT chk_phone CHECK (
        phone IS NULL OR REGEXP_LIKE(phone, '^\\+?[0-9\\s\\-\\(\\)]{7,15}$')
    )
);
```

## Common Regex Patterns

```sql
-- Alphanumeric only
SELECT REGEXP_LIKE('Hello123', '^[a-zA-Z0-9]+$');  -- 1

-- Starts with capital letter
SELECT REGEXP_LIKE('Hello', '^[A-Z]');  -- 1

-- Contains repeated characters
SELECT REGEXP_LIKE('aabbcc', '(.)\\1');  -- 1 (any doubled char)

-- Valid IPv4 address (simplified)
SELECT REGEXP_LIKE('192.168.1.1', '^([0-9]{1,3}\\.){3}[0-9]{1,3}$');  -- 1

-- Only whitespace
SELECT REGEXP_LIKE('   ', '^\\s+$');  -- 1
```

## Summary

`REGEXP_LIKE()` provides powerful regular expression pattern matching in MySQL 8.0+. Use it for data validation in queries (email, phone, date formats), content filtering, and `CHECK` constraints. The `match_type` parameter supports case-insensitive matching (`i`), multiline mode (`m`), and more. It is the preferred function form over the `REGEXP` operator because it supports the `match_type` parameter and is more explicit in code.
