# How to Use ST_Contains() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Query, Geometry, Database, GIS

Description: Learn how to use the ST_Contains() function in MySQL to test whether one geometry completely contains another geometry.

---

## What Is ST_Contains()?

The `ST_Contains(g1, g2)` function in MySQL returns 1 if geometry `g1` completely contains geometry `g2`, meaning every point of `g2` lies within `g1` and their interiors share at least one point. It returns 0 otherwise.

This function is the inverse of `ST_Within()`. If `ST_Contains(A, B)` returns 1, then `ST_Within(B, A)` also returns 1.

## Basic Syntax

```sql
ST_Contains(g1, g2)
```

- `g1` - The containing geometry (polygon or multi-polygon)
- `g2` - The geometry to test for containment (point, line, polygon)

Returns 1 (true) or 0 (false).

## Checking if a Point Is Inside a Polygon

```sql
SET @polygon = ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))');
SET @point_inside = ST_GeomFromText('POINT(5 5)');
SET @point_outside = ST_GeomFromText('POINT(15 15)');

-- Returns 1
SELECT ST_Contains(@polygon, @point_inside);

-- Returns 0
SELECT ST_Contains(@polygon, @point_outside);
```

## Checking if One Polygon Contains Another

```sql
SET @outer = ST_GeomFromText('POLYGON((0 0, 20 0, 20 20, 0 20, 0 0))');
SET @inner = ST_GeomFromText('POLYGON((5 5, 15 5, 15 15, 5 15, 5 5))');

-- Returns 1 because outer fully contains inner
SELECT ST_Contains(@outer, @inner);
```

## Using ST_Contains() with a Table

Create a table of geographic zones and find which zone contains a given location:

```sql
CREATE TABLE zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  boundary POLYGON NOT NULL,
  SPATIAL INDEX (boundary)
);

INSERT INTO zones (name, boundary) VALUES (
  'Downtown',
  ST_GeomFromText('POLYGON((-73.99 40.74, -73.97 40.74, -73.97 40.76, -73.99 40.76, -73.99 40.74))')
);

-- Find which zone contains a specific GPS coordinate
SET @location = ST_GeomFromText('POINT(-73.98 40.75)');

SELECT name
FROM zones
WHERE ST_Contains(boundary, @location);
```

## Filtering Rows Using ST_Contains()

```sql
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  location POINT NOT NULL,
  SPATIAL INDEX (location)
);

-- Find all restaurants inside a delivery zone
SET @delivery_zone = ST_GeomFromText(
  'POLYGON((-73.99 40.74, -73.97 40.74, -73.97 40.76, -73.99 40.76, -73.99 40.74))'
);

SELECT name
FROM restaurants
WHERE ST_Contains(@delivery_zone, location);
```

## ST_Contains() vs ST_Within()

These two functions are mirrors of each other:

```sql
-- These two queries are logically equivalent
SELECT ST_Contains(polygon_col, point_col) FROM spatial_table;
SELECT ST_Within(point_col, polygon_col) FROM spatial_table;
```

The difference is which geometry is the "container." Use `ST_Contains` when you want to ask: "does this large area contain that smaller geometry?"

## Edge Cases and Boundary Behavior

`ST_Contains()` returns 0 if a point lies exactly on the boundary of the polygon. For boundary-inclusive checks, use `ST_Intersects()`, which returns 1 for points both inside and on the boundary:

```sql
SET @polygon = ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))');
SET @boundary_point = ST_GeomFromText('POINT(0 5)');

-- Returns 0 (boundary point excluded)
SELECT ST_Contains(@polygon, @boundary_point);

-- Returns 1 (boundary point included)
SELECT ST_Intersects(@polygon, @boundary_point);
```

## Performance Tips

- Add a `SPATIAL INDEX` on whichever geometry column is stored in your table for faster lookups.
- Ensure geometries use the same SRID to avoid unexpected results.
- Use `ST_SRID()` to check and `ST_Transform()` (if available) to align SRIDs.

```sql
-- Verify SRID
SELECT ST_SRID(boundary) FROM zones LIMIT 1;
```

## Summary

`ST_Contains(g1, g2)` is a core MySQL spatial function for testing whether one geometry fully encloses another. It is widely used in geo-fencing, delivery zone checks, and territory assignment. Pair it with spatial indexes for efficient queries and use `ST_Intersects()` when you need boundary-inclusive containment tests.
