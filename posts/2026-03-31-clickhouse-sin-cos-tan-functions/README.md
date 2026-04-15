# How to Use sin(), cos(), tan() Trigonometric Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Trigonometry, Sin, COS, Tan, Math Function, Analytical Query

Description: Learn how to use sin(), cos(), and tan() trigonometric functions in ClickHouse for angle calculations, signal processing, and geospatial math.

---

ClickHouse provides a full set of trigonometric functions for working with angles, waveforms, and coordinate-based calculations. The core functions - `sin()`, `cos()`, and `tan()` - accept an angle in radians and return a Float64 result.

## Basic Syntax

```sql
SELECT sin(pi() / 2) AS sine_90,
       cos(0)        AS cosine_0,
       tan(pi() / 4) AS tangent_45;
```

```text
sine_90 | cosine_0 | tangent_45
--------+----------+-----------
1       | 1        | 1
```

Use `radians()` to convert degrees to radians before passing values to these functions:

```sql
SELECT sin(radians(30)) AS sin_30_deg,
       cos(radians(60)) AS cos_60_deg,
       tan(radians(45)) AS tan_45_deg;
```

## Computing a Waveform

A common use case is generating or evaluating periodic signals stored in a table. Suppose you have sensor readings with a `phase` column in radians:

```sql
SELECT
    sensor_id,
    timestamp,
    amplitude * sin(phase + offset) AS signal_value
FROM sensor_readings
ORDER BY timestamp;
```

## Coordinate Rotation

Rotating a 2D point `(x, y)` by angle `theta` is a classic matrix operation that maps directly to `sin` and `cos`:

```sql
SELECT
    x * cos(theta) - y * sin(theta) AS x_rotated,
    x * sin(theta) + y * cos(theta) AS y_rotated
FROM points;
```

## Calculating Bearing Between Two Points

For great-circle bearing calculations you can combine `atan2`, `sin`, and `cos`:

```sql
SELECT
    degrees(
        atan2(
            sin(radians(lon2 - lon1)) * cos(radians(lat2)),
            cos(radians(lat1)) * sin(radians(lat2))
              - sin(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2 - lon1))
        )
    ) AS bearing_degrees
FROM locations;
```

## Inverse Trigonometric Counterparts

ClickHouse also provides `asin()`, `acos()`, and `atan()` / `atan2()` for the reverse operations:

```sql
SELECT
    asin(0.5)                   AS arcsin_half,    -- ~0.5236 rad (30 deg)
    acos(0.5)                   AS arccos_half,    -- ~1.0472 rad (60 deg)
    degrees(atan2(1.0, 1.0))    AS atan2_45_deg;   -- 45 deg
```

## Performance Notes

All trigonometric functions operate element-wise on column data with no special index support. For high-frequency calculations across millions of rows, consider materialising the result in a computed column or a materialized view:

```sql
ALTER TABLE sensor_readings
    ADD COLUMN signal_value Float64
    DEFAULT amplitude * sin(phase);
```

## Summary

`sin()`, `cos()`, and `tan()` in ClickHouse follow standard mathematical conventions with angles in radians. They are useful for signal processing, waveform generation, 2D rotation, and geospatial bearing calculations. Pair them with `radians()` and `degrees()` for smooth conversion, and with `asin()`, `acos()`, `atan2()` when you need the inverse operations.
