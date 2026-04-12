# How to Use Bitwise XOR (^) Operator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bitwise, Operator, Integer

Description: Learn how to use the Bitwise XOR (^) operator in MySQL to toggle bits, detect differences between integers, and implement bit-level comparisons.

---

## What Is the Bitwise XOR Operator?

The bitwise XOR (exclusive OR) operator (`^`) in MySQL returns a 1 in each bit position where exactly one of the operands has a 1 (not both, not neither). It is the standard tool for toggling individual bits in a stored value.

## Basic Syntax

```sql
expr1 ^ expr2
```

Both operands are treated as 64-bit unsigned integers.

## Simple Examples

```sql
-- Basic XOR operation
SELECT 12 ^ 10;
-- 12 = 1100
-- 10 = 1010
-- ^  = 0110 = 6
-- Result: 6

SELECT 7 ^ 5;
-- 7 = 111
-- 5 = 101
-- ^ = 010 = 2
-- Result: 2

-- XOR with itself always returns 0
SELECT 42 ^ 42;
-- Result: 0
```

## Practical Use Case: Toggling a Flag

XOR is perfect for toggling a single bit because applying it twice restores the original value:

```sql
-- Toggle the ACTIVE flag (bit 0) for a user
UPDATE users
SET flags = flags ^ 1
WHERE id = 5;

-- Toggle again to restore
UPDATE users
SET flags = flags ^ 1
WHERE id = 5;
```

## Toggling Feature Flags

```sql
CREATE TABLE feature_flags (
  user_id INT PRIMARY KEY,
  flags INT UNSIGNED DEFAULT 0
);

-- DARK_MODE = 1, BETA = 2, NOTIFICATIONS = 4

-- Toggle dark mode for user 10
UPDATE feature_flags
SET flags = flags ^ 1
WHERE user_id = 10;

-- Toggle beta access for all users
UPDATE feature_flags
SET flags = flags ^ 2;
```

## Detecting Differences Between Two Integers

XOR is useful for finding which bits differ between two values:

```sql
-- Which permissions changed between old and new?
SELECT
  old_permissions,
  new_permissions,
  (old_permissions ^ new_permissions) AS changed_bits
FROM permission_audit;
```

## Checking for Exactly One Flag

```sql
-- Check if exactly one of READ or WRITE is set (but not both)
SELECT name, permissions
FROM users
WHERE (permissions & 3) = (1 ^ 2);
-- 1 ^ 2 = 3, so this finds users where both are set
-- For exactly one, use: (permissions & 3) IN (1, 2)
```

## Using XOR for Parity Checks

```sql
-- Compute parity of lower 4 bits
SELECT
  value,
  (value ^ (value >> 1) ^ (value >> 2) ^ (value >> 3)) & 1 AS parity_bit
FROM data_records;
```

## XOR and NULL

```sql
-- XOR with NULL returns NULL
SELECT NULL ^ 5;   -- Result: NULL
SELECT 7 ^ NULL;   -- Result: NULL
```

## XOR vs OR vs AND

```sql
-- OR: set a bit
SELECT 4 | 2;   -- Result: 6 (both bits set)

-- AND: test a bit
SELECT 6 & 2;   -- Result: 2 (bit is set)

-- XOR: toggle a bit
SELECT 6 ^ 2;   -- Result: 4 (bit flipped off)
SELECT 4 ^ 2;   -- Result: 6 (bit flipped on)
```

## Summary

The Bitwise XOR (`^`) operator in MySQL is the cleanest way to toggle specific bits in a stored integer. Because `a ^ b ^ b = a`, it is self-reversing - making it ideal for flip-flop style flag updates. Use it to toggle feature flags, detect which bits changed between two values, or implement lightweight parity checks in your data pipeline.
