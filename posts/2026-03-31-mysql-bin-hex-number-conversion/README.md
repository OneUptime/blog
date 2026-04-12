# How to Use BIN() and HEX() for Number Conversion in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Number Conversion, Database

Description: Learn how to use MySQL BIN() and HEX() functions to convert integers to their binary and hexadecimal string representations.

---

## Overview

MySQL provides `BIN()` and `HEX()` as convenient built-in functions for converting integer values to their binary (base-2) and hexadecimal (base-16) string representations. These functions are useful when working with bitmasks, permissions, color codes, memory addresses, and any scenario where alternate number bases are needed.

---

## BIN() Function

`BIN(N)` converts an integer `N` to its binary string representation. It is equivalent to `CONV(N, 10, 2)`.

```sql
SELECT BIN(10);   -- Returns '1010'
SELECT BIN(255);  -- Returns '11111111'
SELECT BIN(0);    -- Returns '0'
```

The return type is a string. If `N` is `NULL`, the function returns `NULL`.

### Working with Bitmask Permissions

A common use case is visualizing bitmask flags stored as integers:

```sql
CREATE TABLE user_permissions (
    user_id INT,
    permissions INT
);

INSERT INTO user_permissions VALUES (1, 7);   -- 111 in binary: read+write+execute
INSERT INTO user_permissions VALUES (2, 5);   -- 101 in binary: read+execute

SELECT user_id, permissions, BIN(permissions) AS binary_flags
FROM user_permissions;
```

```text
+---------+-------------+--------------+
| user_id | permissions | binary_flags |
+---------+-------------+--------------+
|       1 |           7 | 111          |
|       2 |           5 | 101          |
+---------+-------------+--------------+
```

---

## HEX() for Number Conversion

When `HEX(N)` receives an integer argument, it returns the hexadecimal string representation of that number. This differs from passing a string argument, where it returns the hex encoding of each character byte.

```sql
SELECT HEX(255);    -- Returns 'FF'
SELECT HEX(16);     -- Returns '10'
SELECT HEX(65535);  -- Returns 'FFFF'
SELECT HEX(0);      -- Returns '0'
```

### Converting Colors and Codes

```sql
-- Store a color as an integer and display as hex
SELECT HEX(16711680) AS red_hex;    -- Returns 'FF0000'
SELECT HEX(65280)    AS green_hex;  -- Returns 'FF00'
SELECT HEX(255)      AS blue_hex;   -- Returns 'FF'
```

---

## Converting Back with CONV()

To convert binary or hexadecimal strings back to decimal integers, use the `CONV()` function:

```sql
-- Binary string to decimal
SELECT CONV('1010', 2, 10);   -- Returns '10'

-- Hex string to decimal
SELECT CONV('FF', 16, 10);    -- Returns '255'

-- Decimal to octal
SELECT CONV(8, 10, 8);        -- Returns '10'
```

`CONV(N, from_base, to_base)` is the general-purpose base conversion function and works with bases from 2 to 36.

---

## Using BIN() and HEX() in WHERE Clauses

You can filter rows based on computed binary or hex representations:

```sql
-- Find all values whose binary representation ends in '1' (odd numbers)
SELECT id, value, BIN(value)
FROM my_table
WHERE BIN(value) LIKE '%1';

-- Find values whose hex representation starts with 'F'
SELECT id, value, HEX(value)
FROM my_table
WHERE HEX(value) LIKE 'F%';
```

---

## Practical Example: Displaying Port Numbers in Hex

Network engineers sometimes store ports or protocol values and need hex output for comparison with packet captures:

```sql
CREATE TABLE connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    src_port INT,
    dst_port INT
);

INSERT INTO connections (src_port, dst_port) VALUES (80, 443), (22, 8080);

SELECT
    id,
    src_port,
    CONCAT('0x', HEX(src_port)) AS src_port_hex,
    dst_port,
    CONCAT('0x', HEX(dst_port)) AS dst_port_hex
FROM connections;
```

```text
+----+----------+--------------+----------+--------------+
| id | src_port | src_port_hex | dst_port | dst_port_hex |
+----+----------+--------------+----------+--------------+
|  1 |       80 | 0x50         |      443 | 0x1BB        |
|  2 |       22 | 0x16         |     8080 | 0x1F90       |
+----+----------+--------------+----------+--------------+
```

---

## Monitoring Queries with OneUptime

If you rely on BIN() or HEX() transformations in critical reporting queries, you can use [OneUptime](https://oneuptime.com) to monitor query performance and alert on slowdowns. Tracking these queries through distributed tracing helps ensure your integer conversion logic never becomes a bottleneck in production.

---

## Summary

`BIN(N)` converts an integer to its binary string representation, while `HEX(N)` converts an integer to its hexadecimal string. Both return strings and are commonly used for bitmask visualization, color codes, and network protocol debugging. For more flexible base conversion, use `CONV(N, from_base, to_base)`.
