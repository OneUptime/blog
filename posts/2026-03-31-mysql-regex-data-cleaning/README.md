# How to Use Regular Expressions for Data Cleaning in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Regex, Data Cleaning, REGEXP_REPLACE, String

Description: Learn how to use MySQL regular expressions with REGEXP, REGEXP_REPLACE, and REGEXP_SUBSTR to clean, validate, and transform messy string data at scale.

---

## MySQL Regex Functions Overview

MySQL 8.0 introduced `REGEXP_REPLACE`, `REGEXP_SUBSTR`, and `REGEXP_INSTR` to complement the existing `REGEXP` operator. These functions make it practical to clean complex string data directly in SQL without exporting to application code.

## Finding Rows That Match a Pattern

Use `REGEXP` to identify rows needing cleanup:

```sql
-- Find phone numbers with non-numeric characters
SELECT id, phone
FROM customers
WHERE phone REGEXP '[^0-9+\\-() ]';

-- Find emails with consecutive dots
SELECT id, email
FROM customers
WHERE email REGEXP '\\.{2,}';

-- Find product codes not matching expected pattern (e.g., ABC-12345)
SELECT id, product_code
FROM products
WHERE product_code NOT REGEXP '^[A-Z]{3}-[0-9]{5}$';
```

## Removing Unwanted Characters

Strip non-numeric characters from phone numbers:

```sql
UPDATE customers
SET phone = REGEXP_REPLACE(phone, '[^0-9]', '')
WHERE phone REGEXP '[^0-9]';
```

Remove HTML tags from a description field:

```sql
UPDATE products
SET description = REGEXP_REPLACE(description, '<[^>]+>', '')
WHERE description REGEXP '<[^>]+>';
```

## Normalizing Whitespace

Collapse multiple spaces to a single space:

```sql
UPDATE customers
SET address = REGEXP_REPLACE(TRIM(address), '\\s+', ' ')
WHERE address REGEXP '\\s{2,}';
```

## Extracting Substrings with REGEXP_SUBSTR

Extract a ZIP code from a mixed address string:

```sql
SELECT
  id,
  address,
  REGEXP_SUBSTR(address, '[0-9]{5}(-[0-9]{4})?') AS zip_code
FROM customers;
```

Extract domain from email:

```sql
SELECT
  id,
  email,
  REGEXP_SUBSTR(email, '[^@]+$') AS domain
FROM customers;
```

## Reformatting Phone Numbers

Standardize phone numbers to `(XXX) XXX-XXXX` format after stripping:

```sql
UPDATE customers
SET phone = CONCAT(
  '(',
  SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', ''), 1, 3),
  ') ',
  SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', ''), 4, 3),
  '-',
  SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', ''), 7, 4)
)
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '')) = 10;
```

## Validating with REGEXP Before Insert

Use a `CHECK` constraint (MySQL 8.0.16+) to enforce patterns at the database level:

```sql
ALTER TABLE customers
  ADD CONSTRAINT chk_email_format
  CHECK (email REGEXP '^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$');

ALTER TABLE customers
  ADD CONSTRAINT chk_phone_digits
  CHECK (REGEXP_REPLACE(phone, '[^0-9]', '') REGEXP '^[0-9]{10}$');
```

## Batch Cleaning with REGEXP_REPLACE

Clean up a notes field by removing control characters and non-printable characters:

```sql
UPDATE orders
SET notes = REGEXP_REPLACE(notes, '[\\x00-\\x1F\\x7F]', '')
WHERE notes REGEXP '[\\x00-\\x1F\\x7F]';
```

## Summary

MySQL regex functions - `REGEXP`, `REGEXP_REPLACE`, and `REGEXP_SUBSTR` - are powerful data cleaning tools. Use them to strip unwanted characters, validate formats, extract substrings, and normalize fields in bulk. Add `CHECK` constraints to enforce patterns on future inserts, preventing dirty data from entering the database in the first place.
