# How to Use DOUBLE Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Double, Floating Point, Data Type, Numeric

Description: MySQL DOUBLE stores double-precision floating-point numbers with 15-16 significant digits, suitable for scientific calculations requiring more precision than FLOAT.

---

## What Is the DOUBLE Data Type

`DOUBLE` in MySQL is a double-precision floating-point number that uses 8 bytes of storage. It provides approximately 15-16 significant decimal digits of precision, compared to about 7 for `FLOAT`. Like all floating-point types, `DOUBLE` stores approximate values using binary representation.

Use `DOUBLE` when:
- You need more precision than `FLOAT` but exact values are not required
- You are storing scientific measurements, geographic coordinates, or statistical results
- The data involves large ranges of values with moderate precision requirements

Do not use `DOUBLE` for monetary amounts or financial calculations - use `DECIMAL` instead.

## DOUBLE Aliases

MySQL accepts several aliases for DOUBLE:

- `DOUBLE`
- `DOUBLE PRECISION`
- `REAL` (unless `REAL_AS_FLOAT` SQL mode is enabled)
- `FLOAT(p)` where p is 25-53

## Creating a Table with DOUBLE Columns

```sql
CREATE TABLE scientific_measurements (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  experiment_id   INT UNSIGNED NOT NULL,
  wavelength_nm   DOUBLE NOT NULL,
  intensity       DOUBLE NOT NULL,
  error_margin    DOUBLE,
  measured_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Inserting and Querying DOUBLE Values

```sql
INSERT INTO scientific_measurements
  (experiment_id, wavelength_nm, intensity, error_margin)
VALUES
  (101, 589.0003265, 1.23456789012345, 0.000001),
  (101, 632.8170543, 0.98765432109876, 0.000002);

SELECT experiment_id, wavelength_nm, intensity
FROM scientific_measurements
WHERE experiment_id = 101;
```

Example output:

```text
+---------------+---------------+--------------------+
| experiment_id | wavelength_nm | intensity          |
+---------------+---------------+--------------------+
|           101 | 589.0003265   | 1.2345678901234500 |
|           101 | 632.8170543   | 0.9876543210987600 |
+---------------+---------------+--------------------+
```

## DOUBLE Precision Demonstration

```sql
CREATE TABLE precision_compare (
  flt_val FLOAT,
  dbl_val DOUBLE,
  dec_val DECIMAL(20, 15)
);

INSERT INTO precision_compare VALUES (
  3.141592653589793,
  3.141592653589793,
  3.141592653589793
);

SELECT flt_val, dbl_val, dec_val FROM precision_compare;
```

Example output:

```text
+-----------+--------------------+---------------------+
| flt_val   | dbl_val            | dec_val             |
+-----------+--------------------+---------------------+
| 3.1415927 | 3.1415926535897932 | 3.141592653589793   |
+-----------+--------------------+---------------------+
```

FLOAT provides ~7 digits. DOUBLE provides ~15-16 digits. DECIMAL stores the value exactly as entered.

## Geographic Coordinates with DOUBLE

Geographic latitude and longitude benefit from DOUBLE precision. A FLOAT column has precision to about 1 meter on the Earth's surface, while DOUBLE can represent positions to sub-millimeter accuracy:

```sql
CREATE TABLE locations (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(200) NOT NULL,
  latitude  DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  elevation DOUBLE,
  INDEX idx_coords (latitude, longitude)
);

INSERT INTO locations (name, latitude, longitude, elevation)
VALUES ('Mount Everest Summit', 27.9880740, 86.9253071, 8848.86);
```

## Arithmetic with DOUBLE

DOUBLE values participate in standard arithmetic. Results are also DOUBLE:

```sql
SELECT
  wavelength_nm,
  intensity,
  wavelength_nm * intensity AS product,
  SQRT(intensity)           AS sqrt_intensity,
  EXP(-0.5 * intensity)     AS exponential
FROM scientific_measurements;
```

## Comparing DOUBLE Values

Like FLOAT, avoid equality comparisons with DOUBLE. Use range-based comparisons:

```sql
-- Unreliable
SELECT * FROM scientific_measurements WHERE intensity = 1.23456789012345;

-- Reliable - use a small epsilon range
SELECT * FROM scientific_measurements
WHERE intensity BETWEEN 1.234567890 AND 1.234567891;

-- Or use ROUND for display/comparison
SELECT * FROM scientific_measurements
WHERE ROUND(intensity, 10) = ROUND(1.23456789012345, 10);
```

## DOUBLE vs DECIMAL: When to Use Which

```sql
-- Financial data - use DECIMAL (exact)
CREATE TABLE accounts (
  balance DECIMAL(15, 2) NOT NULL
);

-- Scientific data - use DOUBLE (approximate but high range)
CREATE TABLE spectrometer_data (
  frequency_hz DOUBLE NOT NULL,
  amplitude    DOUBLE NOT NULL
);
```

The key question is: does your application require exact representation (use DECIMAL) or does it work with approximations across a wide value range (use DOUBLE)?

## Aggregate Functions with DOUBLE

```sql
SELECT
  experiment_id,
  COUNT(*)                       AS readings,
  AVG(intensity)                 AS avg_intensity,
  STDDEV(intensity)              AS stddev_intensity,
  MIN(wavelength_nm)             AS min_wavelength,
  MAX(wavelength_nm)             AS max_wavelength
FROM scientific_measurements
GROUP BY experiment_id;
```

## Summary

MySQL `DOUBLE` provides double-precision floating-point storage in 8 bytes with approximately 15-16 significant digits. It is appropriate for scientific measurements, geographic coordinates, and calculations requiring more precision than `FLOAT`. Like all floating-point types, `DOUBLE` stores approximate values, so use range comparisons rather than equality checks. For exact numeric requirements such as financial data, always choose `DECIMAL` over `DOUBLE`.
