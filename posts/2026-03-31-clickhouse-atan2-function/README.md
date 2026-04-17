# How to Use atan2() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Trigonometry, Geospatial

Description: Learn how atan2(y, x) computes full-range bearing angles in ClickHouse, with examples for compass bearings, direction from coordinates, and angle between vectors.

---

`atan2(y, x)` is the two-argument arctangent function that returns the angle in radians between the positive x-axis and the point (x, y). Unlike the single-argument `atan(y/x)`, which is limited to the range (-pi/2, pi/2) and fails when x=0, `atan2()` correctly handles all four quadrants and returns a result in the full range (-pi, pi]. This makes it the correct function for computing compass bearings, movement directions, and any angle that could span the full circle.

## Function Signature

```text
atan2(y, x)
```

Note the argument order: y comes first, x comes second. This matches the mathematical convention for `atan2`. Returns Float64 in radians in the range (-pi, pi].

## Basic Usage

Verify the quadrant handling that makes `atan2` superior to `atan`.

```sql
SELECT
    round(atan2(1,  1)  * 180 / pi(), 1) AS q1_45_deg,
    round(atan2(1, -1)  * 180 / pi(), 1) AS q2_135_deg,
    round(atan2(-1, -1) * 180 / pi(), 1) AS q3_neg135_deg,
    round(atan2(-1, 1)  * 180 / pi(), 1) AS q4_neg45_deg,
    round(atan2(1,  0)  * 180 / pi(), 1) AS positive_y_axis_90_deg,
    round(atan2(0, -1)  * 180 / pi(), 1) AS negative_x_axis_180_deg;
```

Each result correctly identifies the angle for the given quadrant.

## Compass Bearing Calculation

In navigation, bearing is measured clockwise from north (0 at north, 90 at east, 180 at south, 270 at west). Convert the mathematical `atan2` angle to a compass bearing with a coordinate swap and modulo operation.

```text
bearing = (degrees(atan2(delta_lon, delta_lat)) + 360) % 360
```

```sql
CREATE TABLE waypoints
(
    trip_id     UInt32,
    point_order UInt8,
    lat         Float64,
    lon         Float64
)
ENGINE = MergeTree
ORDER BY (trip_id, point_order);

INSERT INTO waypoints VALUES
(1, 1, 40.7128, -74.0060),
(1, 2, 51.5074,  -0.1278),
(2, 1, 48.8566,   2.3522),
(2, 2, 35.6762, 139.6503);
```

Compute the initial compass bearing between consecutive waypoints.

```sql
SELECT
    a.trip_id,
    a.lat AS from_lat, a.lon AS from_lon,
    b.lat AS to_lat,   b.lon AS to_lon,
    round(
        mod(
            atan2(
                sin((b.lon - a.lon) * pi() / 180) * cos(b.lat * pi() / 180),
                cos(a.lat * pi() / 180) * sin(b.lat * pi() / 180) -
                sin(a.lat * pi() / 180) * cos(b.lat * pi() / 180) *
                cos((b.lon - a.lon) * pi() / 180)
            ) * 180 / pi() + 360,
            360
        ),
    1) AS bearing_deg
FROM waypoints a
JOIN waypoints b ON a.trip_id = b.trip_id AND b.point_order = a.point_order + 1;
```

## Direction of Movement in 2D

For a moving object with known velocity components (vx, vy), compute the direction of travel.

```sql
CREATE TABLE object_velocity
(
    object_id  UInt32,
    ts         DateTime,
    vx         Float64,
    vy         Float64
)
ENGINE = MergeTree
ORDER BY (object_id, ts);

INSERT INTO object_velocity VALUES
(1, '2024-10-01 00:00:00',  3.0,  4.0),
(1, '2024-10-01 00:01:00', -2.0,  1.0),
(1, '2024-10-01 00:02:00',  0.0, -5.0),
(2, '2024-10-01 00:00:00',  1.0,  1.0);
```

```sql
SELECT
    object_id,
    ts,
    vx,
    vy,
    round(sqrt(vx*vx + vy*vy), 2)                     AS speed,
    round(atan2(vy, vx) * 180 / pi(), 1)               AS direction_math_deg,
    round(mod(90 - atan2(vy, vx) * 180 / pi(), 360), 1) AS compass_bearing_deg
FROM object_velocity
ORDER BY object_id, ts;
```

## Angle Between Two Vectors

Compute the signed angle between two 2D vectors using `atan2` applied to the cross product and dot product.

```sql
WITH
    1.0 AS a_x, 0.0 AS a_y,
    0.0 AS b_x, 1.0 AS b_y
SELECT
    round(
        atan2(a_x * b_y - a_y * b_x, a_x * b_x + a_y * b_y) * 180 / pi(),
    2) AS signed_angle_deg;
```

The signed angle from vector A to vector B is positive for counterclockwise rotation.

## Summary

`atan2(y, x)` is the correct function for computing full-circle angles in ClickHouse. It handles all four quadrants, avoids division by zero, and returns results in (-pi, pi]. Use it for compass bearing calculations (with appropriate degree offset), direction-of-movement analysis, angle between vectors via cross-product/dot-product, and any scenario where the sign and quadrant of the angle matter. Always remember the argument order: y is the first argument and x is the second.
