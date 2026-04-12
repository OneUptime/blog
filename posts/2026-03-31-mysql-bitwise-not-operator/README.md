# How to Use Bitwise NOT (~) Operator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bitwise, Operator, Integer

Description: Learn how to use the Bitwise NOT (~) operator in MySQL to invert all bits of an integer, create bitmasks, and clear specific flags from stored values.

---

## What Is the Bitwise NOT Operator?

The bitwise NOT operator (`~`) in MySQL is a unary operator that inverts every bit of its operand. A 0 becomes 1, and a 1 becomes 0. MySQL treats all operands as 64-bit unsigned integers, which means `~0` returns `18446744073709551615` (the maximum BIGINT UNSIGNED value).

## Basic Syntax

```sql
~expr
```

## Simple Examples

```sql
-- Invert all bits of 0
SELECT ~0;
-- Result: 18446744073709551615 (all 64 bits set to 1)

-- Invert 1 (0...01 becomes 1...10)
SELECT ~1;
-- Result: 18446744073709551614

-- Invert 255 (00...011111111 becomes 11...100000000)
SELECT ~255;
-- Result: 18446744073709551360
```

## Practical Use Case: Clearing a Flag with AND NOT

The most common real-world use of `~` is to clear (unset) a specific bit using `& ~bit`:

```sql
-- Permissions: READ=1, WRITE=2, DELETE=4, ADMIN=8

-- Remove WRITE permission from a user without touching other bits
UPDATE users
SET permissions = permissions & ~2
WHERE name = 'alice';

-- Verify: if alice had 11 (READ+WRITE+ADMIN), she now has 9 (READ+ADMIN)
SELECT name, permissions FROM users WHERE name = 'alice';
```

## Clearing Multiple Flags at Once

```sql
-- Remove both WRITE and DELETE in one operation (2 | 4 = 6)
UPDATE users
SET permissions = permissions & ~6
WHERE name = 'bob';
```

## Creating Masks

```sql
-- Create a mask that preserves only the lower 8 bits
SELECT value & ~(~0 << 8) AS lower_8_bits
FROM data_table;

-- Equivalent to: value & 255
SELECT value & 255 AS lower_8_bits
FROM data_table;
```

## Using NOT in Combination with XOR and OR

```sql
-- Set bit 3 (OR), toggle bit 1 (XOR), clear bit 0 (AND NOT)
SELECT ((original_flags | 8) ^ 2) & ~1
FROM user_flags;
```

## Understanding the 64-bit Result

Because MySQL uses 64-bit unsigned arithmetic, `~x` for small values produces very large numbers. When storing results back into a smaller column, this can cause unexpected truncation:

```sql
-- Be cautious when the result is stored in a non-BIGINT column
CREATE TABLE flags_demo (
  id INT,
  flag_val INT UNSIGNED
);

-- ~2 is a 64-bit number; MySQL will clamp it for INT UNSIGNED columns
-- Always use it in combination with AND to keep values within range
INSERT INTO flags_demo VALUES (1, 15 & ~2);  -- Result: 13
```

## NULL Handling

```sql
-- NOT of NULL is NULL
SELECT ~NULL;  -- Result: NULL
```

## Summary

The Bitwise NOT (`~`) operator in MySQL inverts all bits of a 64-bit unsigned integer. Its most practical application is clearing specific flags in a bitmask column using the `column & ~flag` pattern. This lets you remove a permission or feature flag atomically without reading the current value first. Be mindful of the 64-bit result when working with smaller column types, and always combine `~` with `&` to avoid storing unexpectedly large values.
