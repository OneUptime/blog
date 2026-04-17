# How to Use asin(), acos(), atan() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Trigonometry, Geospatial

Description: Learn how asin(), acos(), and atan() compute inverse trigonometric values in ClickHouse, with examples for bearing angles and inverse coordinate transformations.

---

The inverse trigonometric functions `asin()`, `acos()`, and `atan()` are the mathematical inverses of `sin()`, `cos()`, and `tan()` respectively. They take a ratio or value as input and return the corresponding angle in radians. These functions are essential for recovering angles from computed ratios, converting Cartesian coordinates back to polar form, computing bearing angles in geospatial work, and implementing geometric algorithms that require angle recovery.

## Function Signatures

```text
asin(x)   -- arcsine; input in [-1, 1], output in [-pi/2, pi/2]
acos(x)   -- arccosine; input in [-1, 1], output in [0, pi]
atan(x)   -- arctangent; input unrestricted, output in (-pi/2, pi/2)
```

All three return Float64 in radians. To convert the output to degrees, multiply by `180 / pi()`.

## Basic Usage

```sql
SELECT
    round(asin(0.5),  4) AS asin_half,
    round(acos(0.5),  4) AS acos_half,
    round(atan(1.0),  4) AS atan_one,
    round(asin(0.5)  * 180 / pi(), 2) AS asin_half_deg,
    round(acos(0.5)  * 180 / pi(), 2) AS acos_half_deg,
    round(atan(1.0)  * 180 / pi(), 2) AS atan_one_deg;
```

`asin(0.5)` = pi/6 (30 degrees), `acos(0.5)` = pi/3 (60 degrees), `atan(1)` = pi/4 (45 degrees).

## Cartesian to Polar Conversion

Convert (x, y) Cartesian coordinates back to polar form (radius, angle) using `sqrt()` for the radius and `atan2()` or `atan()` for the angle.

```sql
SELECT
    point.1                                      AS x,
    point.2                                      AS y,
    round(sqrt(x*x + y*y), 4)                    AS radius,
    round(atan(y / x) * 180 / pi(), 2)           AS angle_deg_atan,
    round(atan2(y, x) * 180 / pi(), 2)           AS angle_deg_atan2
FROM (
    SELECT arrayJoin([(1.0, 0.0), (0.0, 1.0), (-1.0, 0.0), (0.0, -1.0)]) AS point
);
```

Note: `atan()` alone cannot distinguish quadrants. Use `atan2(y, x)` for full 360-degree coverage.

## Setting Up Geospatial Data

Create a table of sensor positions to demonstrate inverse trig in angular calculations.

```sql
CREATE TABLE sensor_network
(
    sensor_id   UInt32,
    sensor_name String,
    x_meters    Float64,
    y_meters    Float64
)
ENGINE = MergeTree
ORDER BY sensor_id;

INSERT INTO sensor_network VALUES
(1, 'base_station', 0.0, 0.0),
(2, 'node_north',   0.0, 100.0),
(3, 'node_east',  100.0, 0.0),
(4, 'node_ne',     70.7, 70.7),
(5, 'node_sw',    -50.0, -50.0);
```

## Computing Bearing Angle from Base Station

Calculate the angle from the base station to each sensor node, expressed in degrees from the positive x-axis.

```sql
SELECT
    s.sensor_name,
    s.x_meters,
    s.y_meters,
    round(sqrt(s.x_meters * s.x_meters + s.y_meters * s.y_meters), 2) AS distance_m,
    round(atan(s.y_meters / nullIf(s.x_meters, 0)) * 180 / pi(), 2)   AS angle_deg
FROM sensor_network s
WHERE s.sensor_id != 1
ORDER BY s.sensor_id;
```

## Computing the Angle Between Two Vectors

Use `acos()` with the dot product formula to find the angle between two direction vectors.

```text
angle = acos( (A . B) / (|A| * |B|) )
```

```sql
WITH
    1.0    AS ax, 0.0    AS ay,
    0.7071 AS bx, 0.7071 AS by_v
SELECT
    round(
        acos(
            (ax * bx + ay * by_v) /
            (sqrt(ax*ax + ay*ay) * sqrt(bx*bx + by_v*by_v))
        ) * 180 / pi(),
    2) AS angle_between_degrees;
```

## Angle of Inclination from Rise and Run

Compute the angle of a slope given horizontal distance (run) and vertical height (rise).

```sql
SELECT
    slope.1                                       AS run,
    slope.2                                       AS rise,
    round(atan(rise / run) * 180 / pi(), 2)       AS angle_deg,
    round(atan(rise / run) * 180 / pi() / 90, 4)  AS grade_normalized
FROM (
    SELECT arrayJoin([(10.0, 1.0), (5.0, 1.0), (2.0, 1.0), (1.0, 1.0)]) AS slope
);
```

## Using asin() in the Haversine Formula

`asin()` appears directly in the haversine formula for great-circle distance. The term `asin(sqrt(...))` recovers the angular distance from the haversine value.

```sql
SELECT
    round(
        2 * 6371 * asin(sqrt(
            pow(sin((51.5074 - 40.7128) * pi() / 180 / 2), 2) +
            cos(40.7128 * pi() / 180) *
            cos(51.5074 * pi() / 180) *
            pow(sin((-0.1278 - (-74.0060)) * pi() / 180 / 2), 2)
        )),
    0) AS london_to_new_york_km;
```

## Summary

`asin()`, `acos()`, and `atan()` recover angles from trigonometric ratios in ClickHouse. Use `asin()` in haversine and similar geometric formulas, `acos()` to find the angle between two vectors via the dot product, and `atan()` for slope angles and single-quadrant angle recovery. All return radians; multiply by `180 / pi()` to convert to degrees. For full 360-degree bearing calculations, prefer `atan2(y, x)` over `atan(y/x)` as it correctly handles all four quadrants without division-by-zero risk.
