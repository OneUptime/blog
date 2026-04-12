# How to Choose Between CHAR and VARCHAR in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, CHAR, VARCHAR, Database Design, Performance

Description: Understand the key differences between CHAR and VARCHAR in MySQL and learn when to use each for optimal storage and query performance.

---

## Overview of CHAR and VARCHAR

Both `CHAR` and `VARCHAR` store character string data, but they differ in how they handle storage and padding:

- `CHAR(N)` - fixed-length string, always stores exactly N characters. Shorter values are right-padded with spaces.
- `VARCHAR(N)` - variable-length string, stores only as many characters as needed plus 1-2 bytes for the length prefix.

```sql
CREATE TABLE comparison_demo (
    fixed_code   CHAR(10),
    variable_name VARCHAR(100)
);
```

## Storage Differences

The storage behavior is a key factor in choosing between the two:

```sql
-- CHAR(10) always uses 10 bytes regardless of actual value length
-- VARCHAR(100) uses actual length + 1 byte (if max <= 255) or +2 bytes

-- Example showing actual storage
INSERT INTO comparison_demo VALUES ('ABC', 'ABC');
-- CHAR stores: 'ABC       ' (7 trailing spaces)
-- VARCHAR stores: 'ABC' (3 bytes + 1 length byte = 4 bytes)
```

For a full comparison table:

```text
Value     | CHAR(10) storage | VARCHAR(10) storage
----------|------------------|---------------------
''        | 10 bytes         | 1 byte
'abc'     | 10 bytes         | 4 bytes
'abcdefgh' | 10 bytes        | 9 bytes
'abcdefghij' | 10 bytes      | 11 bytes
```

## When to Use CHAR

Use `CHAR` when the string length is consistent and well-known:

```sql
-- Good use cases for CHAR
CREATE TABLE countries (
    country_code CHAR(2),   -- ISO 2-letter codes always 2 chars
    currency_code CHAR(3),  -- ISO currency codes always 3 chars
    phone_area_code CHAR(3) -- Area codes always 3 digits
);

CREATE TABLE sessions (
    session_token CHAR(36),  -- UUID strings are always 36 chars
    status CHAR(1)           -- Single-char status codes: 'A', 'I', 'P'
);
```

Fixed-length strings benefit from CHAR because MySQL can calculate offsets directly without reading length prefixes, improving row access speed.

## When to Use VARCHAR

Use `VARCHAR` when string lengths vary significantly:

```sql
-- Good use cases for VARCHAR
CREATE TABLE users (
    username VARCHAR(50),     -- Usernames vary in length
    email VARCHAR(255),       -- Email lengths vary widely
    bio VARCHAR(500),         -- User bios are unpredictable in length
    first_name VARCHAR(100),
    last_name VARCHAR(100)
);

CREATE TABLE products (
    product_name VARCHAR(200),
    description VARCHAR(1000),
    sku VARCHAR(50)
);
```

## Performance Considerations

```sql
-- CHAR columns in MyISAM enable fixed-row-length tables (faster full scans)
-- In InnoDB, the difference is smaller but CHAR still benefits lookups

-- Create an index on a CHAR column - very predictable key sizes
CREATE TABLE orders (
    order_ref CHAR(12) NOT NULL,
    INDEX idx_order_ref (order_ref)
);

-- VARCHAR index - MySQL uses the full defined length for index estimation
CREATE TABLE articles (
    slug VARCHAR(200) NOT NULL,
    INDEX idx_slug (slug(50))  -- Prefix index for long VARCHARs
);
```

## Trailing Space Behavior

`CHAR` strips trailing spaces on retrieval (unless the `PAD_CHAR_TO_FULL_LENGTH` SQL mode is enabled). `VARCHAR` preserves them:

```sql
CREATE TABLE space_test (
    c CHAR(5),
    v VARCHAR(5)
);

INSERT INTO space_test VALUES ('ab   ', 'ab   ');

SELECT CONCAT('[', c, ']'), CONCAT('[', v, ']') FROM space_test;
-- CHAR result:    [ab]      (trailing spaces stripped)
-- VARCHAR result: [ab   ]   (trailing spaces preserved)
```

## Practical Decision Guide

```sql
-- Use CHAR for:
-- - Country/state/currency codes
-- - UUIDs and hash digests (MD5 = CHAR(32), SHA1 = CHAR(40))
-- - Status flags and type codes
-- - Phone number components with fixed format

-- Use VARCHAR for:
-- - Names, emails, addresses
-- - URLs and slugs
-- - Descriptions and titles
-- - Any user-provided text

-- Example: well-designed table using both
CREATE TABLE customers (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    uuid       CHAR(36) NOT NULL,           -- Always 36 chars
    first_name VARCHAR(100) NOT NULL,       -- Varies
    last_name  VARCHAR(100) NOT NULL,       -- Varies
    country    CHAR(2) NOT NULL,            -- Always 2 chars
    email      VARCHAR(255) NOT NULL,       -- Varies
    status     CHAR(1) DEFAULT 'A'         -- Single char code
);
```

## Summary

Choose `CHAR` for fixed-length strings like codes, hashes, and UUIDs - it avoids the length-prefix overhead and enables faster row access. Choose `VARCHAR` for variable-length data like names, emails, and descriptions - it saves storage when values are shorter than the maximum. In InnoDB (the default engine), the performance gap is small, so correctness and clarity should guide your decision.
