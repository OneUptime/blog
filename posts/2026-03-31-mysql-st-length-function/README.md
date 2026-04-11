# How to Use ST_Length() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_Length() function to measure the length of linestring and multilinestring geometries in Cartesian and geodetic systems.

---

## What is ST_Length()?

`ST_Length()` returns the length of a linestring or multilinestring geometry. For Cartesian geometries (SRID 0), the result is in the same units as the coordinates. For geographic geometries using SRID 4326 (WGS 84), MySQL 8.0 computes the geodetic length in meters along the earth's surface.

## Basic Syntax

```sql
ST_Length(linestring [, unit])
```

The optional `unit` parameter (MySQL 8.0.16+) accepts values like `'metre'`, `'kilometre'`, `'foot'`, `'mile'` etc.

## Simple Linestring Length

```sql
-- Cartesian example: length of a line from (0,0) to (3,4)
SELECT ST_Length(
  ST_GeomFromText('LINESTRING(0 0, 3 4)', 0)
) AS length;
```

```text
+--------+
| length |
+--------+
|      5 |
+--------+
```

The Pythagorean result of a 3-4-5 right triangle is 5 units.

## Geodetic Length Using SRID 4326

```sql
-- Approximate length of a geographic path in meters
SELECT ST_Length(
  ST_GeomFromText(
    'LINESTRING(40.7128 -74.0060, 34.0522 -118.2437)',
    4326
  )
) AS length_meters;
```

This returns the geodetic distance in meters along the earth's surface between New York and Los Angeles (approximately 3,940 km).

## Specifying Units

```sql
-- Return length in kilometres
SELECT ST_Length(
  ST_GeomFromText(
    'LINESTRING(40.7128 -74.0060, 34.0522 -118.2437)',
    4326
  ),
  'kilometre'
) AS length_km;
```

## Practical Example: Road Network Analysis

```sql
CREATE TABLE roads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  route LINESTRING NOT NULL SRID 4326,
  SPATIAL INDEX (route)
);

INSERT INTO roads (name, route) VALUES
  ('Main St', ST_GeomFromText(
    'LINESTRING(40.7580 -73.9855, 40.7614 -73.9776)',
    4326
  ));

SELECT
  name,
  ROUND(ST_Length(route), 2) AS length_meters,
  ROUND(ST_Length(route, 'kilometre'), 4) AS length_km
FROM roads;
```

## MultiLinestring Length

For multilinestrings, `ST_Length()` returns the sum of the lengths of all component linestrings:

```sql
SELECT ST_Length(
  ST_GeomFromText(
    'MULTILINESTRING((0 0, 3 4), (10 10, 13 14))',
    0
  )
) AS total_length;
```

```text
+--------------+
| total_length |
+--------------+
|           10 |
+--------------+
```

Two 3-4-5 triangles each contribute 5 units for a total of 10.

## ST_Length vs ST_Distance

`ST_Length()` measures the length of a linestring geometry (a path with multiple points). `ST_Distance()` measures the shortest distance between two separate geometries (which may be a single straight line between two points). Use `ST_Length()` when you have a route or track and need its total length.

## Null Handling

`ST_Length()` returns `NULL` for non-linear geometries:

```sql
SELECT ST_Length(ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 0))', 0));
-- Returns NULL
```

## Summary

`ST_Length()` measures the length of linestring and multilinestring geometries. For SRID 0, the result is in Cartesian units. For SRID 4326, the result is a geodetic measurement in meters by default, or in any unit you specify with the optional second argument. Use this function for route length calculations, pipeline measurements, and path analysis.
