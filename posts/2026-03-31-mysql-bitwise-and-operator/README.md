# How to Use Bitwise AND (&) Operator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bitwise, Operator, Integer

Description: Learn how to use the Bitwise AND (&) operator in MySQL to perform bit-level comparisons, manage permission flags, and filter data with bitmask patterns.

---

## What Is the Bitwise AND Operator?

The bitwise AND operator (`&`) in MySQL compares each bit of two integer values. It returns a 1 in each bit position where both operands have a 1, and 0 everywhere else. This is commonly used for permission flags, feature toggles, and compact multi-state storage.

## Basic Syntax

```sql
expr1 & expr2
```

Both operands are treated as 64-bit unsigned integers.

## Simple Examples

```sql
-- Basic AND operation
SELECT 12 & 10;
-- 12 = 1100
-- 10 = 1010
-- &  = 1000 = 8
-- Result: 8

SELECT 7 & 3;
-- 7 = 111
-- 3 = 011
-- & = 011 = 3
-- Result: 3
```

## Practical Use Case: Permission Flags

A common pattern is storing user permissions as a single integer where each bit represents one permission:

```sql
-- Define permission constants
-- READ    = 1  (0001)
-- WRITE   = 2  (0010)
-- DELETE  = 4  (0100)
-- ADMIN   = 8  (1000)

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  permissions INT UNSIGNED DEFAULT 0
);

-- Assign READ + WRITE + ADMIN = 1 + 2 + 8 = 11
INSERT INTO users (name, permissions) VALUES ('alice', 11);

-- Assign READ only = 1
INSERT INTO users (name, permissions) VALUES ('bob', 1);
```

## Checking if a Specific Flag Is Set

```sql
-- Find users with WRITE permission (bit 2)
SELECT name, permissions
FROM users
WHERE (permissions & 2) > 0;

-- Find users with both READ and WRITE
SELECT name
FROM users
WHERE (permissions & 3) = 3;
```

## Using Bitwise AND in SELECT

```sql
-- Show which permissions each user has
SELECT
  name,
  permissions,
  (permissions & 1) AS can_read,
  (permissions & 2) AS can_write,
  (permissions & 4) AS can_delete,
  (permissions & 8) AS is_admin
FROM users;
```

## Masking Specific Bits

```sql
-- Mask the lower 4 bits of a value
SELECT 255 & 15;  -- Result: 15 (extracts lower nibble)

-- Mask to check if a number is even (bit 0 must be 0)
SELECT 42 & 1;  -- Result: 0 (even)
SELECT 43 & 1;  -- Result: 1 (odd)
```

## Combining with UPDATE

```sql
-- Remove WRITE permission from a user (clear bit 2)
UPDATE users
SET permissions = permissions & ~2
WHERE name = 'bob';
-- Note: ~2 in MySQL is the bitwise NOT of 2

-- Verify
SELECT name, permissions FROM users WHERE name = 'bob';
```

## Data Type Considerations

MySQL performs bitwise AND on BIGINT UNSIGNED values. Avoid using negative integers or non-integer types:

```sql
-- This works correctly
SELECT 255 & 240;  -- Result: 240

-- Bitwise AND on NULL returns NULL
SELECT NULL & 7;   -- Result: NULL
```

## Summary

The Bitwise AND (`&`) operator is a powerful tool in MySQL for compact flag storage and bitmask filtering. It shines in permission systems, feature flags, and any scenario where multiple boolean states need to be stored in a single column. Use `(column & bitmask) = bitmask` to check for the presence of specific bits, and combine with `UPDATE` to clear flags efficiently.
