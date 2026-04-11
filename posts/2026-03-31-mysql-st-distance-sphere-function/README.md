# How to Use ST_Distance_Sphere() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_Distance_Sphere() function to calculate the great-circle distance between two geographic points on the earth's surface.

---

## What is ST_Distance_Sphere()?

`ST_Distance_Sphere()` computes the shortest distance between two points on a sphere using the haversine formula. It assumes a spherical earth model with a radius of 6,370,986 meters. The result is in meters.

This is the fastest way to calculate geographic distances in MySQL. For higher accuracy at large scales, use `ST_Distance()` with SRID 4326 which uses an ellipsoidal earth model, but `ST_Distance_Sphere()` is adequate for most practical applications.

## Basic Syntax

```sql
ST_Distance_Sphere(point1, point2 [, radius])
```

- `point1`, `point2` - `POINT` geometries in SRID 4326 or SRID 0
- `radius` - optional sphere radius in meters (default: 6,370,986)

## Calculating Distance Between Two Cities

```sql
-- Distance between New York and London in meters
SELECT ST_Distance_Sphere(
  ST_GeomFromText('POINT(40.7128 -74.0060)', 4326),
  ST_GeomFromText('POINT(51.5074 -0.1278)', 4326)
) AS distance_meters;
```

```text
+------------------+
| distance_meters  |
+------------------+
| 5570223.88       |
+------------------+
```

Approximately 5,570 km.

## Converting to Kilometers

```sql
SELECT
  ST_Distance_Sphere(
    ST_GeomFromText('POINT(40.7128 -74.0060)', 4326),
    ST_GeomFromText('POINT(51.5074 -0.1278)', 4326)
  ) / 1000 AS distance_km;
```

## Practical Example: Finding Nearby Stores

```sql
CREATE TABLE stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  location POINT NOT NULL SRID 4326,
  SPATIAL INDEX (location)
);

INSERT INTO stores (name, location) VALUES
  ('Downtown', ST_GeomFromText('POINT(40.7580 -73.9855)', 4326)),
  ('Midtown',  ST_GeomFromText('POINT(40.7549 -73.9840)', 4326)),
  ('Uptown',   ST_GeomFromText('POINT(40.7831 -73.9712)', 4326));

-- Find stores within 3km of a user location
SET @user_lat = 40.7614;
SET @user_lon = -73.9776;
SET @radius_m = 3000;

SELECT
  name,
  ROUND(ST_Distance_Sphere(
    location,
    ST_GeomFromText(CONCAT('POINT(', @user_lat, ' ', @user_lon, ')'), 4326)
  ), 2) AS distance_meters
FROM stores
HAVING distance_meters <= @radius_m
ORDER BY distance_meters;
```

## Using ST_Distance_Sphere with Stored Points

When your table already stores points in a spatial column:

```sql
SELECT
  s1.name AS store_a,
  s2.name AS store_b,
  ROUND(ST_Distance_Sphere(s1.location, s2.location) / 1000, 2) AS distance_km
FROM stores s1
JOIN stores s2 ON s1.id < s2.id
ORDER BY distance_km;
```

## Custom Sphere Radius

For applications on other planets or when using a different earth radius approximation:

```sql
-- Using the equatorial radius of Earth (6,378,137 m per WGS84)
SELECT ST_Distance_Sphere(
  ST_GeomFromText('POINT(0 0)', 4326),
  ST_GeomFromText('POINT(0 1)', 4326),
  6378137
) AS distance_m;
```

## ST_Distance_Sphere vs ST_Distance

| Function | Model | Accuracy | Performance |
|---|---|---|---|
| `ST_Distance_Sphere()` | Spherical (haversine) | Good | Fast |
| `ST_Distance()` with SRID 4326 | Ellipsoidal (geodesic) | Better | Slower |

For distances under 1,000 km, the difference is typically less than 0.3%.

## Summary

`ST_Distance_Sphere()` returns the great-circle distance between two geographic points in meters using a spherical earth model. It is ideal for proximity searches, distance filtering, and sorting results by distance. For performance, combine it with a bounding box filter using a spatial index, then apply `ST_Distance_Sphere()` for precise distance calculation.
