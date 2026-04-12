# How to Find Points Within a Radius in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Query, Geolocation, Database, GIS

Description: Learn how to find all database points within a given radius in MySQL using spatial functions and the Haversine formula.

---

## Overview

Finding points within a radius is one of the most common geospatial operations, used in applications like "find nearby stores," "show drivers within 5 km," and delivery zone checks. MySQL provides two main approaches: the Haversine formula for lat/lng columns and the native spatial functions with `ST_Distance_Sphere()`.

## Approach 1: Using ST_Distance_Sphere()

`ST_Distance_Sphere()` calculates the great-circle distance between two points on the Earth's surface in meters. It is the simplest and most accurate approach for lat/lng data.

```sql
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  coords POINT NOT NULL SRID 4326,
  SPATIAL INDEX (coords)
);

INSERT INTO locations (name, coords) VALUES
  ('Coffee Shop A', ST_GeomFromText('POINT(40.7128 -74.0060)', 4326)),
  ('Coffee Shop B', ST_GeomFromText('POINT(40.7200 -74.0100)', 4326)),
  ('Coffee Shop C', ST_GeomFromText('POINT(40.8000 -74.0500)', 4326));
```

Find all locations within 2 km of a reference point:

```sql
SET @center = ST_GeomFromText('POINT(40.7128 -74.0060)', 4326);
SET @radius_meters = 2000;

SELECT
  name,
  ROUND(ST_Distance_Sphere(coords, @center)) AS distance_meters
FROM locations
WHERE ST_Distance_Sphere(coords, @center) <= @radius_meters
ORDER BY distance_meters;
```

## Approach 2: Using ST_Within() with a Buffer

You can create a circular buffer polygon around a point and then use `ST_Within()` to filter:

```sql
SET @center_lng = -74.0060;
SET @center_lat = 40.7128;
SET @radius_deg = 0.018; -- Approximately 2 km in degrees

SELECT name
FROM locations
WHERE ST_Within(
  coords,
  ST_Buffer(ST_GeomFromText(CONCAT('POINT(', @center_lat, ' ', @center_lng, ')'), 4326), @radius_deg)
);
```

Note: `ST_Buffer()` with geographic spatial reference systems (SRID 4326) is not supported in all MySQL 8.0 versions and may produce an error. When supported, the degree-based radius creates an elliptical approximation that varies by latitude. For accurate radius queries, use `ST_Distance_Sphere()` (Approach 1) instead.

## Approach 3: Haversine Formula (Decimal Columns)

If your table stores latitude and longitude as `DECIMAL` columns rather than `POINT`:

```sql
CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7)
);

INSERT INTO stores (name, latitude, longitude) VALUES
  ('Store A', 40.7128, -74.0060),
  ('Store B', 40.7200, -74.0100),
  ('Store C', 40.8000, -74.0500);
```

Find stores within 5 km using the Haversine formula:

```sql
SET @lat = 40.7128;
SET @lng = -74.0060;
SET @radius_km = 5;

SELECT
  name,
  latitude,
  longitude,
  (6371 * ACOS(
    COS(RADIANS(@lat)) * COS(RADIANS(latitude)) *
    COS(RADIANS(longitude) - RADIANS(@lng)) +
    SIN(RADIANS(@lat)) * SIN(RADIANS(latitude))
  )) AS distance_km
FROM stores
HAVING distance_km <= @radius_km
ORDER BY distance_km;
```

## Bounding Box Pre-Filter for Performance

Full-table Haversine scans are expensive. Use a bounding box to narrow candidates first:

```sql
SET @lat = 40.7128;
SET @lng = -74.0060;
SET @radius_km = 5;
SET @lat_delta = @radius_km / 111.0;
SET @lng_delta = @radius_km / (111.0 * COS(RADIANS(@lat)));

SELECT name,
  (6371 * ACOS(
    COS(RADIANS(@lat)) * COS(RADIANS(latitude)) *
    COS(RADIANS(longitude) - RADIANS(@lng)) +
    SIN(RADIANS(@lat)) * SIN(RADIANS(latitude))
  )) AS distance_km
FROM stores
WHERE latitude BETWEEN @lat - @lat_delta AND @lat + @lat_delta
  AND longitude BETWEEN @lng - @lng_delta AND @lng + @lng_delta
HAVING distance_km <= @radius_km
ORDER BY distance_km;
```

Add composite indexes on `(latitude, longitude)` for this approach to work efficiently.

## Summary

MySQL supports radius-based point queries through `ST_Distance_Sphere()` for `POINT` columns with SRID 4326, or via the Haversine formula for decimal lat/lng columns. For large datasets, always apply a bounding box pre-filter before computing exact distances to avoid full-table scans.
