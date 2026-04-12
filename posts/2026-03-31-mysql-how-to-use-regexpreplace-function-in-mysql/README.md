# How to Use REGEXP_REPLACE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, REGEXP_REPLACE, Regular Expression, String Function, Data Cleaning

Description: Learn how to use the REGEXP_REPLACE() function in MySQL 8.0+ to replace substrings matching a regular expression pattern with a replacement string.

---

## What Is REGEXP_REPLACE?

`REGEXP_REPLACE(expr, pattern, replacement [, pos [, occurrence [, match_type]]])` replaces occurrences of a regular expression pattern within a string with a replacement string. It was introduced in MySQL 8.0 and uses the ICU (International Components for Unicode) regular expression library, which provides full Unicode support and is multibyte safe.

```sql
-- Replace all non-numeric characters
SELECT REGEXP_REPLACE('Phone: (123) 456-7890', '[^0-9]', '');
-- Returns: '1234567890'
```

## Basic Syntax

```sql
-- Basic replacement
SELECT REGEXP_REPLACE('Hello World', 'World', 'MySQL');
-- Returns: 'Hello MySQL'

-- Replace all vowels
SELECT REGEXP_REPLACE('Hello World', '[aeiouAEIOU]', '*');
-- Returns: 'H*ll* W*rld'

-- Remove extra spaces
SELECT REGEXP_REPLACE('Hello   World   MySQL', '  +', ' ');
-- Returns: 'Hello World MySQL'
```

## Parameters in Detail

```sql
-- pos: starting position for search (default 1)
SELECT REGEXP_REPLACE('aaa bbb aaa', 'aaa', 'xxx', 5);
-- Returns: 'aaa bbb xxx' (starts replacing from position 5)

-- occurrence: which occurrence to replace (0 = all, 1 = first, 2 = second, etc.)
SELECT REGEXP_REPLACE('cat dog cat dog', 'cat', 'bird', 1, 2);
-- Returns: 'cat dog bird dog' (replaces only the 2nd occurrence)

-- match_type: flags like 'i' (case-insensitive), 'c' (case-sensitive)
SELECT REGEXP_REPLACE('Hello HELLO hello', 'hello', 'HI', 1, 0, 'i');
-- Returns: 'HI HI HI' (case-insensitive, all occurrences)
```

## Data Cleaning Examples

```sql
-- Remove HTML tags
SELECT REGEXP_REPLACE('<p>Hello <b>World</b></p>', '<[^>]+>', '');
-- Returns: 'Hello World'

-- Normalize phone numbers (remove all non-digits)
SELECT REGEXP_REPLACE(phone, '[^0-9]', '') AS clean_phone
FROM contacts;

-- Remove leading/trailing whitespace (beyond TRIM - handles all whitespace)
SELECT REGEXP_REPLACE('  Hello   World  ', '^\\s+|\\s+$', '');
-- Returns: 'Hello   World'

-- Collapse multiple spaces to single space
SELECT REGEXP_REPLACE(TRIM(address), '\\s{2,}', ' ') AS normalized_address
FROM customers;
```

## Updating Data with REGEXP_REPLACE

```sql
-- Clean up phone numbers in the database
UPDATE contacts
SET phone = REGEXP_REPLACE(phone, '[^0-9+]', '')
WHERE phone REGEXP '[^0-9+\\-\\(\\) ]';

-- Standardize email domain to lowercase
UPDATE users
SET email = CONCAT(
    SUBSTRING_INDEX(email, '@', 1),
    '@',
    LOWER(SUBSTRING_INDEX(email, '@', -1))
)
WHERE email REGEXP BINARY '@.*[A-Z]';

-- Remove trailing punctuation from product names
UPDATE products
SET name = REGEXP_REPLACE(name, '[.,;:!?]+$', '')
WHERE name REGEXP '[.,;:!?]$';
```

## Extracting with REGEXP_REPLACE

You can use REGEXP_REPLACE to extract parts of strings by replacing everything else:

```sql
-- Extract only digits from a string
SELECT REGEXP_REPLACE('Order #12345 from Jan 2025', '[^0-9]', '');
-- Returns: '123452025' (all digits concatenated)

-- Extract domain from email (remove everything before and including @)
SELECT REGEXP_REPLACE('user@example.com', '^[^@]+@', '');
-- Returns: 'example.com'

-- More accurate extraction using REGEXP_SUBSTR
SELECT REGEXP_SUBSTR('user@example.com', '[^@]+$');
-- Returns: 'example.com'
```

## Common Regex Patterns

```sql
-- Remove all non-alphanumeric characters
SELECT REGEXP_REPLACE('Hello, World! 2025', '[^a-zA-Z0-9 ]', '');
-- Returns: 'Hello World 2025'

-- Replace multiple consecutive identical characters
SELECT REGEXP_REPLACE('Looooong wooord', '(.)\\1+', '$1');
-- Returns: 'Long word'

-- Standardize date separators
SELECT REGEXP_REPLACE('2025.03.31', '\\.', '-');
-- Returns: '2025-03-31'

-- Remove SQL injection-like patterns (basic sanitization)
SELECT REGEXP_REPLACE(user_input, '(--|;|/\\*|\\*/|xp_)', '', 1, 0, 'i');
```

## Summary

`REGEXP_REPLACE()` is a powerful string manipulation function in MySQL 8.0+ for pattern-based text substitution. It supports full regular expression syntax including character classes, quantifiers, and backreferences. Common use cases include phone number normalization, HTML tag removal, whitespace cleanup, and data standardization. The optional `pos`, `occurrence`, and `match_type` parameters give fine-grained control over replacement behavior.
