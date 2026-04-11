# How to Use POWER() and SQRT() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Mathematical Function, Database

Description: Learn how to use MySQL POWER() to raise a number to an exponent and SQRT() to compute the square root for mathematical and scientific calculations.

---

## Overview

MySQL provides two fundamental exponentiation functions:

- `POWER()` (alias: `POW()`) - raises a base number to a given exponent.
- `SQRT()` - returns the square root of a non-negative number.

These are used in financial calculations, geometric distance formulas, statistical analysis, and scientific data processing.

---

## POWER() / POW() Function

Raises `X` to the power of `Y`.

**Syntax:**

```sql
POWER(X, Y)
POW(X, Y)   -- identical alias
```

- Returns a `DOUBLE` value.
- Returns `NULL` if either argument is `NULL`.
- `POWER(X, 0)` always returns `1`.
- `POWER(0, 0)` returns `1`.
- Negative exponents return fractional values.

### Basic Examples

```sql
SELECT POWER(2, 10);
-- Returns: 1024.0

SELECT POWER(3, 3);
-- Returns: 27.0

SELECT POWER(5, 0);
-- Returns: 1.0

SELECT POWER(2, -1);
-- Returns: 0.5

SELECT POWER(4, 0.5);
-- Returns: 2.0  (square root via power)

SELECT POWER(8, 1/3);
-- Returns: ~1.9999  (cube root; 1/3 yields 0.3333 in MySQL due to decimal division precision)

SELECT POW(10, 6);
-- Returns: 1000000.0
```

---

## SQRT() Function

Returns the non-negative square root of a non-negative number.

**Syntax:**

```sql
SQRT(X)
```

- Returns a `DOUBLE`.
- Returns `NULL` if `X` is negative or `NULL`.
- Equivalent to `POWER(X, 0.5)`.

### Basic Examples

```sql
SELECT SQRT(4);
-- Returns: 2.0

SELECT SQRT(9);
-- Returns: 3.0

SELECT SQRT(2);
-- Returns: 1.4142135623730951

SELECT SQRT(0);
-- Returns: 0.0

SELECT SQRT(-1);
-- Returns: NULL  (negative numbers have no real square root)

SELECT SQRT(NULL);
-- Returns: NULL
```

---

## Relationship Between POWER() and SQRT()

```mermaid
flowchart LR
    A[Number X] -->|SQRT(X)| B[Square root: X^0.5]
    A -->|POWER(X, 0.5)| B
    A -->|POWER(X, 2)| C[Square: X^2]
    C -->|SQRT()| A
```

---

## Euclidean Distance Calculation

A classic use of `POWER()` and `SQRT()` is computing the straight-line distance between two points:

```sql
-- Distance formula: sqrt((x2-x1)^2 + (y2-y1)^2)
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    x DOUBLE,
    y DOUBLE
);

INSERT INTO locations (name, x, y) VALUES
('Warehouse', 0, 0),
('Store A',   3, 4),
('Store B',   6, 8),
('Store C',   1, 1);

-- Distance from Warehouse to each location
SELECT
    l.name,
    ROUND(
        SQRT(POWER(l.x - w.x, 2) + POWER(l.y - w.y, 2)),
        2
    ) AS distance
FROM locations l
CROSS JOIN locations w
WHERE w.name = 'Warehouse' AND l.name != 'Warehouse';
```

Result:

| name    | distance |
|---------|----------|
| Store A | 5.00     |
| Store B | 10.00    |
| Store C | 1.41     |

---

## Compound Interest Calculation

```sql
-- Future value = P * (1 + r)^n
-- P = principal, r = rate, n = years
SELECT
    10000 AS principal,
    0.05  AS rate,
    10    AS years,
    ROUND(10000 * POWER(1 + 0.05, 10), 2) AS future_value;
-- Returns: 16288.95
```

---

## Standard Deviation Using POWER()

While MySQL has `STDDEV()` as an aggregate function, you can compute it manually to understand the formula:

```sql
-- Compute population standard deviation manually
SELECT
    SQRT(
        AVG(POWER(amount - avg_amount, 2))
    ) AS manual_stddev,
    STDDEV_POP(amount) AS builtin_stddev
FROM (
    SELECT amount, AVG(amount) OVER () AS avg_amount
    FROM orders
) t;
```

---

## Scaling Values with Square Root Normalization

```sql
-- Normalize values to 0-1 scale using square root compression
SELECT
    value,
    ROUND(SQRT(value) / SQRT(MAX(value) OVER ()), 4) AS normalized
FROM measurements;
```

---

## POWER() for Unit Conversions

```sql
-- Convert between cubic and linear units
-- 1 cubic meter = 100^3 cubic centimeters
SELECT POWER(100, 3) AS cubic_cm_per_cubic_m;
-- Returns: 1000000.0

-- Convert km^2 to m^2
SELECT POWER(1000, 2) AS sqm_per_sqkm;
-- Returns: 1000000.0
```

---

## Checking for Perfect Squares

```sql
-- Find perfect square numbers in a table
SELECT n
FROM numbers
WHERE SQRT(n) = FLOOR(SQRT(n))
  AND n > 0;
```

---

## NULL and Edge Case Behavior

```sql
SELECT POWER(NULL, 2);    -- NULL
SELECT POWER(2, NULL);    -- NULL
SELECT SQRT(NULL);        -- NULL
SELECT SQRT(-4);          -- NULL
SELECT POWER(0, 0);       -- 1
SELECT POWER(-2, 3);      -- -8.0
SELECT POWER(-2, 0.5);    -- NULL  (imaginary number)
```

---

## Summary

`POWER()` (alias `POW()`) raises a base to a given exponent and returns a `DOUBLE`, while `SQRT()` computes the non-negative square root and is equivalent to `POWER(X, 0.5)`. They are widely used for Euclidean distance calculations, compound interest, statistical variance and standard deviation, unit conversions, and any mathematical formula involving exponentiation. Both return `NULL` for invalid inputs such as negative exponents on zero or imaginary results.
