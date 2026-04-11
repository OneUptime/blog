# How to Use SIN(), COS(), TAN() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Trigonometry, Database

Description: Learn how to use MySQL SIN(), COS(), and TAN() for trigonometric calculations including geographic distance and circular data analysis.

---

## Overview

MySQL provides the three fundamental trigonometric functions:

- `SIN(X)` - returns the sine of angle `X` (in radians).
- `COS(X)` - returns the cosine of angle `X` (in radians).
- `TAN(X)` - returns the tangent of angle `X` (in radians).

All three accept their argument in **radians**, not degrees. Use `RADIANS()` to convert degrees to radians before calling these functions.

---

## SIN() Function

**Syntax:**

```sql
SIN(X)
```

- `X` is an angle in radians.
- Returns a `DOUBLE` in the range `[-1, 1]`.
- Returns `NULL` if `X` is `NULL`.

```sql
SELECT SIN(0);
-- Returns: 0

SELECT SIN(PI() / 2);
-- Returns: 1  (sin 90°)

SELECT SIN(PI());
-- Returns: ~0  (sin 180° = 0, minor floating-point noise)

SELECT SIN(RADIANS(30));
-- Returns: 0.5  (sin 30°)

SELECT SIN(RADIANS(90));
-- Returns: 1
```

---

## COS() Function

**Syntax:**

```sql
COS(X)
```

- `X` is an angle in radians.
- Returns a `DOUBLE` in the range `[-1, 1]`.
- Returns `NULL` if `X` is `NULL`.

```sql
SELECT COS(0);
-- Returns: 1  (cos 0°)

SELECT COS(PI() / 2);
-- Returns: ~0  (cos 90° = 0)

SELECT COS(PI());
-- Returns: -1  (cos 180°)

SELECT COS(RADIANS(60));
-- Returns: 0.5  (cos 60°)
```

---

## TAN() Function

**Syntax:**

```sql
TAN(X)
```

- `X` is an angle in radians.
- Returns a `DOUBLE`. Value can be any real number.
- Undefined (very large) at 90°, 270°, etc. (odd multiples of PI/2).
- Returns `NULL` if `X` is `NULL`.

```sql
SELECT TAN(0);
-- Returns: 0

SELECT TAN(PI() / 4);
-- Returns: ~1  (tan 45°)

SELECT TAN(RADIANS(45));
-- Returns: 1

SELECT TAN(RADIANS(0));
-- Returns: 0
```

---

## Trigonometric Identity Verification

```sql
-- sin^2 + cos^2 = 1 (Pythagorean identity)
SELECT
    ROUND(POWER(SIN(RADIANS(37)), 2) + POWER(COS(RADIANS(37)), 2), 10) AS identity_check;
-- Returns: 1.0000000000

-- tan = sin/cos
SELECT
    ROUND(TAN(RADIANS(45)), 10) AS tan_45,
    ROUND(SIN(RADIANS(45)) / COS(RADIANS(45)), 10) AS sin_over_cos;
-- Both return: 1.0
```

---

## How Trig Functions Map Angles

```mermaid
flowchart TD
    A[Angle in degrees] -->|RADIANS()| B[Angle in radians]
    B -->|SIN()| C["Opposite / Hypotenuse: range -1 to 1"]
    B -->|COS()| D["Adjacent / Hypotenuse: range -1 to 1"]
    B -->|TAN()| E["Opposite / Adjacent: range -inf to +inf"]
```

---

## Haversine Formula: Distance Between Two GPS Points

The most practical use of `SIN()` and `COS()` in MySQL is computing the great-circle distance between two geographic coordinates:

```sql
-- Haversine distance in kilometers
-- Inputs: lat1, lon1, lat2, lon2 in decimal degrees
CREATE FUNCTION haversine_km(lat1 DOUBLE, lon1 DOUBLE, lat2 DOUBLE, lon2 DOUBLE)
RETURNS DOUBLE DETERMINISTIC
BEGIN
    DECLARE R DOUBLE DEFAULT 6371;  -- Earth radius in km
    DECLARE dlat DOUBLE;
    DECLARE dlon DOUBLE;
    DECLARE a DOUBLE;
    DECLARE c DOUBLE;

    SET dlat = RADIANS(lat2 - lat1);
    SET dlon = RADIANS(lon2 - lon1);
    SET a = POWER(SIN(dlat / 2), 2)
          + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * POWER(SIN(dlon / 2), 2);
    SET c = 2 * ASIN(SQRT(a));

    RETURN R * c;
END;
```

Usage:

```sql
-- Distance from London (51.5074, -0.1278) to Paris (48.8566, 2.3522)
SELECT ROUND(haversine_km(51.5074, -0.1278, 48.8566, 2.3522), 1) AS distance_km;
-- Returns: ~343.6 km
```

---

## Finding Nearby Locations

```sql
CREATE TABLE stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    lat DOUBLE,
    lng DOUBLE
);

INSERT INTO stores VALUES
(1, 'London HQ',  51.5074, -0.1278),
(2, 'Paris Store', 48.8566, 2.3522),
(3, 'Berlin Store', 52.5200, 13.4050),
(4, 'Madrid Store', 40.4168, -3.7038);

-- Find stores within 500 km of a user at (50.0, 0.0)
SELECT
    name,
    ROUND(
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(lat - 50.0) / 2), 2) +
            COS(RADIANS(50.0)) * COS(RADIANS(lat)) *
            POWER(SIN(RADIANS(lng - 0.0) / 2), 2)
        )), 1
    ) AS dist_km
FROM stores
HAVING dist_km <= 500
ORDER BY dist_km;
```

---

## Generating Circular Coordinates

```sql
-- Generate 8 points evenly distributed on a unit circle
SELECT
    seq,
    ROUND(COS(RADIANS(seq * 45)), 4) AS x,
    ROUND(SIN(RADIANS(seq * 45)), 4) AS y
FROM (
    SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
) t;
```

---

## Inverse Trig Functions

MySQL also provides inverse functions:

```sql
SELECT ASIN(1);         -- PI/2 ≈ 1.5708
SELECT ACOS(1);         -- 0
SELECT ATAN(1);         -- PI/4 ≈ 0.7854
SELECT ATAN2(1, 1);     -- PI/4 (two-argument arctangent)
SELECT DEGREES(ASIN(0.5));  -- 30°
```

---

## Summary

`SIN()`, `COS()`, and `TAN()` implement the standard trigonometric functions in MySQL, taking angles in radians. They are most practically used for geographic distance calculations using the Haversine formula, circular coordinate generation, and scientific data analysis. Always convert degrees to radians with `RADIANS()` before passing to these functions, and convert results back with `DEGREES()` when needed. MySQL also provides the inverse functions `ASIN()`, `ACOS()`, `ATAN()`, and `ATAN2()` for completing the trigonometric toolkit.
