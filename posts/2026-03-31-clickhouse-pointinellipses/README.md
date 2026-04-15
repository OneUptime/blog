# How to Use pointInEllipses() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Analytics, Location, Query

Description: Learn how pointInEllipses() tests whether a 2D point falls inside one or more ellipses in ClickHouse, useful for geo-fence approximations and coverage area analysis.

---

`pointInEllipses(x, y, x0, y0, a, b, ...)` returns `1` if the point `(x, y)` lies inside any of the ellipses defined by the remaining arguments. Each ellipse is specified by four parameters: center `(x0, y0)`, semi-axis `a` (along x), and semi-axis `b` (along y). The function accepts multiple ellipses in a single call - the total number of arguments is 2 + 4n for n ellipses. It returns `UInt8` (0 or 1). The coordinate space is Euclidean, so for geographic use you must project coordinates to a planar system (such as a local equirectangular projection) or use small enough areas where the flat-Earth approximation is acceptable.

## Basic Usage

```sql
-- Is point (3, 4) inside an ellipse centered at (0,0) with semi-axes 5 and 3?
SELECT pointInEllipses(3, 4, 0, 0, 5, 3) AS inside;
```

```text
inside
0
```

```sql
-- Point exactly at the edge
SELECT pointInEllipses(5, 0, 0, 0, 5, 3) AS on_edge;
```

```text
on_edge
1
```

## Understanding the Ellipse Equation

A point `(x, y)` is inside ellipse `(x0, y0, a, b)` when:

```text
((x - x0) / a)^2 + ((y - y0) / b)^2 <= 1
```

```sql
-- Verify: manually compute the ellipse inequality
SELECT
    ((3.0 - 0.0) / 5.0) * ((3.0 - 0.0) / 5.0)
    + ((0.0 - 0.0) / 3.0) * ((0.0 - 0.0) / 3.0) AS ellipse_value,  -- <= 1 means inside
    pointInEllipses(3, 0, 0, 0, 5, 3) AS function_result;
```

```text
ellipse_value  function_result
0.36           1
```

## Checking Multiple Ellipses at Once

Pass additional groups of four arguments to test multiple ellipses in a single call. Returns `1` if the point is inside ANY ellipse.

```sql
-- Is (6, 0) inside either of two ellipses?
SELECT pointInEllipses(
    6, 0,
    0, 0, 5, 3,      -- first ellipse: center (0,0), a=5, b=3
    10, 0, 6, 4      -- second ellipse: center (10,0), a=6, b=4
) AS inside_any;
```

```text
inside_any
1
```

## Geographic Coverage Area: Approximate Zone Membership

For small geographic areas (up to ~50 km radius), treat longitude as x and latitude as y. Degrees at mid-latitudes approximate kilometers reasonably if you apply a longitude correction.

```sql
-- Flag events within a coverage ellipse (approx. 50km EW x 30km NS around a city center)
-- 1 degree lat ~ 111 km; 1 degree lon ~ 111 * cos(lat) km
-- For lat=37.7: 1 deg lon ~ 88 km; semi-axes in degrees: 50/88 ~ 0.57 lon, 30/111 ~ 0.27 lat
SELECT
    event_id,
    longitude,
    latitude,
    pointInEllipses(
        longitude, latitude,
        -122.4194, 37.7749,   -- center: San Francisco
        0.57, 0.27            -- semi-axes in degrees (approx 50km x 30km)
    ) AS in_coverage_zone
FROM location_events
WHERE event_time >= today()
LIMIT 20;
```

## Coverage Analysis: Percentage Inside a Zone

```sql
-- What fraction of store visits occurred within the target coverage ellipse?
SELECT
    count()                     AS total_visits,
    countIf(pointInEllipses(
        longitude, latitude,
        -73.9857, 40.7484,  -- Times Square, NYC
        0.05, 0.03          -- ~4.4 km EW x 3.3 km NS
    ))                          AS in_zone,
    round(100.0 * countIf(pointInEllipses(
        longitude, latitude,
        -73.9857, 40.7484,
        0.05, 0.03
    )) / count(), 2)            AS pct_in_zone
FROM store_visits
WHERE visit_time >= today() - 30;
```

## Signal Coverage Modeling for Cell Towers

Cellular signal coverage areas are often elliptical due to antenna directionality.

```sql
-- Mark devices as covered by at least one cell tower
SELECT
    device_id,
    longitude,
    latitude,
    pointInEllipses(
        longitude, latitude,
        -- Tower 1: center, semi-axes
        -122.400, 37.780, 0.03, 0.02,
        -- Tower 2
        -122.430, 37.760, 0.025, 0.018,
        -- Tower 3
        -122.410, 37.800, 0.02, 0.015
    ) AS has_coverage
FROM mobile_devices
WHERE last_seen >= now() - INTERVAL 5 MINUTE;
```

## Comparing pointInEllipses() vs pointInPolygon()

```sql
-- For circular/elliptical zones, pointInEllipses is simpler and faster
-- For arbitrary polygons (city boundaries, census tracts), use pointInPolygon

-- Approximate a circle as a wide ellipse (a = b = radius)
SELECT
    event_id,
    pointInEllipses(longitude, latitude,
        -122.4194, 37.7749, 0.045, 0.045) AS in_5km_circle
FROM location_events
LIMIT 5;
```

## Batch Zone Assignment

```sql
-- Assign each location to a named elliptical zone
SELECT
    loc_id,
    CASE
        WHEN pointInEllipses(x, y, 0,  0,  10, 5) THEN 'zone-a'
        WHEN pointInEllipses(x, y, 20, 0,  8,  6) THEN 'zone-b'
        WHEN pointInEllipses(x, y, 10, 15, 12, 7) THEN 'zone-c'
        ELSE 'no-zone'
    END AS assigned_zone
FROM device_positions;
```

## Summary

`pointInEllipses(x, y, x0, y0, a, b, ...)` tests whether a Euclidean 2D point lies inside one or more ellipses defined by center and semi-axis parameters. It is useful for approximate geographic zone membership when the area is small enough for a flat-Earth assumption, cell tower coverage modeling, and batch zone assignment. For precise polygon boundaries (city limits, service territories), use `pointInPolygon()`. For circular zones, set `a = b` to use `pointInEllipses()` as a circle containment test.
