# How to Use PI() and RADIANS() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Trigonometry, Database

Description: Learn how to use MySQL PI() to get the value of pi and RADIANS() to convert degrees to radians for use with trigonometric functions.

---

## Overview

Two essential constants and conversion functions for trigonometric work in MySQL:

- `PI()` - returns the mathematical constant pi (approximately 3.14159265358979).
- `RADIANS(X)` - converts degrees to radians.

These are prerequisites for working with `SIN()`, `COS()`, `TAN()`, and circle geometry.

---

## PI() Function

Returns the value of pi as a `DOUBLE`.

**Syntax:**

```sql
PI()
```

```sql
SELECT PI();
-- Returns: 3.141592653589793

SELECT ROUND(PI(), 5);
-- Returns: 3.14159

SELECT PI() * 2;
-- Returns: 6.283185307179586  (2π)
```

MySQL stores `PI()` with 15 significant digits of double-precision floating-point accuracy.

---

## RADIANS() Function

Converts an angle from degrees to radians.

**Syntax:**

```sql
RADIANS(X)
```

- `X` is an angle in degrees.
- Returns `X * PI() / 180` as a `DOUBLE`.
- Returns `NULL` if `X` is `NULL`.

**Formula:**

```text
radians = degrees * (PI / 180)
```

### Basic Examples

```sql
SELECT RADIANS(0);
-- Returns: 0

SELECT RADIANS(90);
-- Returns: 1.5707963267948966  (PI/2)

SELECT RADIANS(180);
-- Returns: 3.141592653589793   (PI)

SELECT RADIANS(270);
-- Returns: 4.71238898038469    (3*PI/2)

SELECT RADIANS(360);
-- Returns: 6.283185307179586   (2*PI)

SELECT RADIANS(45);
-- Returns: 0.7853981633974483  (PI/4)

SELECT RADIANS(30);
-- Returns: 0.5235987755982988

SELECT RADIANS(NULL);
-- Returns: NULL
```

---

## Degrees to Radians Reference

| Degrees | Radians (exact) | RADIANS() value |
|---------|-----------------|-----------------|
| 0       | 0               | 0               |
| 30      | PI/6            | 0.5236          |
| 45      | PI/4            | 0.7854          |
| 60      | PI/3            | 1.0472          |
| 90      | PI/2            | 1.5708          |
| 120     | 2*PI/3          | 2.0944          |
| 180     | PI              | 3.1416          |
| 270     | 3*PI/2          | 4.7124          |
| 360     | 2*PI            | 6.2832          |

---

## How RADIANS() and DEGREES() Relate

```mermaid
flowchart LR
    A[Degrees] -->|"RADIANS() = deg * PI/180"| B[Radians]
    B -->|"DEGREES() = rad * 180/PI"| A
```

```sql
-- Round-trip conversion
SELECT DEGREES(RADIANS(90));
-- Returns: 90.0

SELECT RADIANS(DEGREES(PI() / 2));
-- Returns: 1.5707963267948966  (PI/2)
```

---

## Using PI() and RADIANS() with Trig Functions

```sql
-- Sine of 30 degrees
SELECT SIN(RADIANS(30));
-- Returns: 0.49999999999999994  (~0.5)

-- Cosine of 60 degrees
SELECT COS(RADIANS(60));
-- Returns: 0.5000000000000001   (~0.5)

-- Tangent of 45 degrees
SELECT TAN(RADIANS(45));
-- Returns: 0.9999999999999999   (~1.0)

-- Angle in terms of PI
SELECT SIN(PI() / 6);    -- sin(30°) ≈ 0.5
SELECT COS(PI() / 3);    -- cos(60°) ≈ 0.5
```

---

## Circle Calculations Using PI()

```sql
CREATE TABLE circles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    radius DOUBLE
);

INSERT INTO circles (name, radius) VALUES
('Small', 5),
('Medium', 10),
('Large', 25);

SELECT
    name,
    radius,
    ROUND(PI() * radius * radius, 2)    AS area,
    ROUND(2 * PI() * radius, 2)         AS circumference
FROM circles;
```

Result:

| name   | radius | area     | circumference |
|--------|--------|----------|---------------|
| Small  | 5      | 78.54    | 31.42         |
| Medium | 10     | 314.16   | 62.83         |
| Large  | 25     | 1963.50  | 157.08        |

---

## Sphere Volume and Surface Area

```sql
SELECT
    r AS radius,
    ROUND((4.0 / 3.0) * PI() * POWER(r, 3), 2) AS sphere_volume,
    ROUND(4 * PI() * POWER(r, 2), 2)            AS sphere_surface_area
FROM (
    SELECT 1 AS r UNION SELECT 5 UNION SELECT 10
) t;
```

---

## Geographic: Converting Degrees to Radians for Distance

```sql
-- Distance between two lat/lon points using Haversine
SET @lat1 = 51.5074;
SET @lon1 = -0.1278;
SET @lat2 = 48.8566;
SET @lon2 = 2.3522;

SELECT ROUND(
    6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(@lat2 - @lat1) / 2), 2) +
        COS(RADIANS(@lat1)) * COS(RADIANS(@lat2)) *
        POWER(SIN(RADIANS(@lon2 - @lon1) / 2), 2)
    )), 1
) AS distance_km;
-- Returns: ~343.5 km (London to Paris)
```

---

## PI() vs Hardcoding

Always use `PI()` instead of hardcoding `3.14159`:

```sql
-- Less precise (hardcoded)
SELECT 3.14159 * 10 * 10 AS area_approx;

-- More precise (PI() function)
SELECT PI() * 10 * 10 AS area_precise;
-- Returns: 314.1592653589793
```

---

## Summary

`PI()` returns the double-precision value of pi (3.14159265358979...), and `RADIANS()` converts degree measurements to radians by multiplying by `PI()/180`. These are foundational for trigonometric calculations in MySQL. Use `RADIANS()` to convert any degree-based angle before passing it to `SIN()`, `COS()`, or `TAN()`. Use `PI()` directly for circle geometry calculations such as area (`PI() * r^2`) and circumference (`2 * PI() * r`). The inverse conversion function is `DEGREES()`.
