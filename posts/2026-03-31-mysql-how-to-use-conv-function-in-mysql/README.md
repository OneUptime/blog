# How to Use CONV() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Conv, Base Conversion, Number Systems, SQL Functions

Description: Learn how to use MySQL's CONV() function to convert numbers between different bases such as binary, octal, decimal, and hexadecimal.

---

## Overview

The `CONV()` function in MySQL converts a number from one numeric base to another. It accepts the value as a string along with the source base and target base, making it straightforward to work with binary, octal, decimal, and hexadecimal representations.

## Basic Syntax

```sql
CONV(N, from_base, to_base)
```

- `N` - the number to convert, specified as an integer or a string
- `from_base` - the base of the input number (2 to 36)
- `to_base` - the base to convert to (2 to 36)

Returns `NULL` if any argument is `NULL`. `CONV()` works with 64-bit precision.

## Common Base Conversions

```sql
-- Decimal to binary
SELECT CONV('10', 10, 2);   -- returns '1010'

-- Decimal to hexadecimal
SELECT CONV('255', 10, 16); -- returns 'FF'

-- Hexadecimal to decimal
SELECT CONV('FF', 16, 10);  -- returns '255'

-- Binary to decimal
SELECT CONV('1010', 2, 10); -- returns '10'

-- Hexadecimal to binary
SELECT CONV('FF', 16, 2);   -- returns '11111111'

-- Octal to decimal
SELECT CONV('17', 8, 10);   -- returns '15'

-- Decimal to octal
SELECT CONV('15', 10, 8);   -- returns '17'
```

## Converting Stored Values

```sql
-- Convert an integer column from decimal to hex
SELECT id, CONV(id, 10, 16) AS hex_id
FROM orders;

-- Convert a stored hex code column to decimal
SELECT product_code, CONV(product_code, 16, 10) AS decimal_code
FROM inventory;
```

## Negative Numbers

A negative `to_base` instructs MySQL to treat the result as a signed number:

```sql
-- Signed conversion
SELECT CONV('FFFFFFFFFFFFFFFF', 16, -10); -- returns '-1'
SELECT CONV('-1', -10, 16);               -- returns 'FFFFFFFFFFFFFFFF'
```

## Using CONV() with IP Addresses

```sql
-- Convert an integer IP representation to dotted notation
SELECT INET_NTOA(CONV('C0A80101', 16, 10)); -- 192.168.1.1

-- Convert dotted IP to hex
SELECT CONV(INET_ATON('192.168.1.1'), 10, 16); -- C0A80101
```

## Practical Example: Encoding Short IDs

```sql
CREATE TABLE short_links (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  url TEXT NOT NULL
);

INSERT INTO short_links (url) VALUES ('https://example.com/very/long/path');

-- Generate a base-36 short code from the ID
SELECT id, CONV(id, 10, 36) AS short_code, url
FROM short_links;
```

Base-36 uses digits 0-9 and letters A-Z, producing compact codes like `1Z` instead of `71`.

## Chaining CONV() with Other Functions

```sql
-- Pad a binary representation to 8 bits with LPAD
SELECT LPAD(CONV(n, 10, 2), 8, '0') AS binary_byte
FROM (SELECT 42 AS n) t;
-- returns '00101010'

-- Extract the upper nibble of a hex byte
SELECT LEFT(CONV(val, 10, 16), 1) AS upper_nibble
FROM bytes;
```

## Limitations

- Input values are treated as unsigned 64-bit integers by default.
- Bases outside 2-36 return `NULL`.
- Fractional parts are not supported; only integer values are converted.

## Summary

`CONV()` is a versatile MySQL function for converting numbers between any base from 2 to 36. It is useful for generating compact short codes, working with binary or hexadecimal data, and debugging IP address representations. The input number can be specified as an integer or a string, and you must specify both the source and target bases.
