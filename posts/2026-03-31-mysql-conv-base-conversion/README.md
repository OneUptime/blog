# How to Use CONV() Function in MySQL for Base Conversion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Base Conversion, Database

Description: Learn how to use MySQL CONV() to convert numbers between any two bases from 2 to 36, including binary, octal, decimal, and hexadecimal.

---

## What Is the CONV() Function?

`CONV()` converts a number (represented as a string) from one numeric base to another. It generalizes the specific functions `BIN()`, `OCT()`, and `HEX()` by supporting any base between 2 and 36.

**Syntax:**

```sql
CONV(N, from_base, to_base)
```

- `N` - the number to convert, given as a string or integer.
- `from_base` - the base of the input number (2 to 36).
- `to_base` - the target base (2 to 36). A negative value causes signed conversion (preserves the minus sign for negative numbers).
- Returns `NULL` if any argument is `NULL`, if `from_base` or `to_base` is out of range, or if `N` contains characters invalid for `from_base`.

---

## Basic Examples

```sql
-- Decimal to binary
SELECT CONV(255, 10, 2);
-- Returns: '11111111'

-- Decimal to hexadecimal
SELECT CONV(255, 10, 16);
-- Returns: 'FF'

-- Decimal to octal
SELECT CONV(255, 10, 8);
-- Returns: '377'

-- Binary to decimal
SELECT CONV('11111111', 2, 10);
-- Returns: '255'

-- Hex to decimal
SELECT CONV('FF', 16, 10);
-- Returns: '255'

-- Hex to binary
SELECT CONV('FF', 16, 2);
-- Returns: '11111111'

-- Binary to hex
SELECT CONV('11111111', 2, 16);
-- Returns: 'FF'
```

---

## Base 36 (Alphanumeric)

Base 36 uses digits `0-9` and letters `A-Z`, making it useful for compact alphanumeric identifiers:

```sql
-- Decimal to base 36
SELECT CONV(1000000, 10, 36);
-- Returns: 'LFLS'

-- Base 36 back to decimal
SELECT CONV('LFLS', 36, 10);
-- Returns: '1000000'
```

---

## Negative Numbers and Unsigned Behavior

With positive bases (the default), `CONV()` treats numbers as unsigned 64-bit integers. A negative input wraps around to its unsigned equivalent:

```sql
SELECT CONV(-1, 10, 16);
-- Returns: 'FFFFFFFFFFFFFFFF'  (64-bit unsigned representation)

SELECT CONV(-1, 10, 2);
-- Returns: '1111111111111111111111111111111111111111111111111111111111111111'
```

---

## How CONV() Works

```mermaid
flowchart LR
    A["Input string N in from_base"] --> B[Parse digits valid for from_base]
    B --> C[Convert to internal 64-bit integer]
    C --> D[Express integer in to_base]
    D --> E[Return uppercase string result]
```

---

## Full Base Conversion Table for 255

```sql
SELECT
    CONV(255, 10, 2)   AS base2,
    CONV(255, 10, 8)   AS base8,
    CONV(255, 10, 10)  AS base10,
    CONV(255, 10, 16)  AS base16,
    CONV(255, 10, 36)  AS base36;
```

Result:

| base2    | base8 | base10 | base16 | base36 |
|----------|-------|--------|--------|--------|
| 11111111 | 377   | 255    | FF     | 73     |

---

## Practical Use: Compact ID Generation

Store large integer IDs in a shorter representation for URLs or tokens:

```sql
-- Shorten a large user ID for a URL slug
SELECT CONV(9876543210, 10, 36) AS short_id;
-- Returns: '4JC8LII' (much shorter than the decimal)

-- Expand it back
SELECT CONV('4JC8LII', 36, 10) AS user_id;
-- Returns: '9876543210'
```

---

## Hex String to Integer

```sql
-- Convert hex color code to decimal R, G, B
SET @color = 'FF8040';

SELECT
    CONV(SUBSTR(@color, 1, 2), 16, 10) AS red,    -- 255
    CONV(SUBSTR(@color, 3, 2), 16, 10) AS green,   -- 128
    CONV(SUBSTR(@color, 5, 2), 16, 10) AS blue;    -- 64
```

---

## Using CONV() with Column Data

```sql
CREATE TABLE network_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_hex VARCHAR(8)
);

INSERT INTO network_data (ip_hex) VALUES
('C0A80001'),   -- 192.168.0.1
('C0A8006E');   -- 192.168.0.110

-- Convert hex IP to decimal octets
SELECT
    ip_hex,
    CONV(SUBSTRING(ip_hex, 1, 2), 16, 10) AS octet1,
    CONV(SUBSTRING(ip_hex, 3, 2), 16, 10) AS octet2,
    CONV(SUBSTRING(ip_hex, 5, 2), 16, 10) AS octet3,
    CONV(SUBSTRING(ip_hex, 7, 2), 16, 10) AS octet4
FROM network_data;
```

---

## CONV() vs BIN() / OCT() / HEX()

| Function       | Equivalent CONV()        | Limitation              |
|----------------|--------------------------|-------------------------|
| `BIN(N)`       | `CONV(N, 10, 2)`         | Only decimal input      |
| `OCT(N)`       | `CONV(N, 10, 8)`         | Only decimal input      |
| `HEX(N)`       | `CONV(N, 10, 16)`        | Also works on strings   |
| `CONV(N, a, b)`| (general)                | Any base 2-36           |

`CONV()` is more flexible but requires explicit base specification.

---

## Edge Cases and NULL Behavior

```sql
SELECT CONV(NULL, 10, 16);     -- NULL
SELECT CONV('XYZ', 16, 10);    -- NULL (X and Y are invalid for base 16)
SELECT CONV('GH', 36, 10);     -- '593' (G=16, H=17, both valid in base 36)
SELECT CONV('', 10, 16);       -- '0'
SELECT CONV(0, 10, 2);         -- '0'
```

---

## Overflow Behavior

`CONV()` works with 64-bit unsigned integers. Values larger than `2^64 - 1` are capped:

```sql
SELECT CONV('FFFFFFFFFFFFFFFF', 16, 10);
-- Returns: '18446744073709551615'  (max 64-bit unsigned)
```

---

## Summary

`CONV()` is MySQL's general-purpose base conversion function, capable of transforming numbers between any two bases from 2 to 36. It subsumes the functionality of `BIN()`, `OCT()`, and numeric `HEX()` while adding support for bases like 36 that are useful for generating compact alphanumeric identifiers. Use it whenever you need cross-base arithmetic, hex color parsing, IP address manipulation, or shortened ID generation.
