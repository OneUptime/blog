# How to Use ST_Within() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Functions, GIS, Geospatial, ST_Within

Description: Learn how to use MySQL's ST_Within() function to test whether one geometry is completely contained within another, with practical geofencing examples.

---

## What Is ST_Within()?

`ST_Within(g1, g2)` is a MySQL spatial function that returns 1 (true) if geometry `g1` is completely within geometry `g2`, and 0 (false) otherwise. It is the inverse of `ST_Contains()`.

A geometry is considered to be within another if all its points lie inside or on the boundary of the second geometry.

## Syntax

```sql
ST_Within(g1, g2)
```

Returns:
- `1` - g1 is completely within g2
- `0` - g1 is not within g2
- `NULL` - if either argument is NULL

## Basic Example

```sql
-- Is the point (2,2) within the polygon?
SELECT ST_Within(
  ST_GeomFromText('POINT(2 2)'),
  ST_GeomFromText('POLYGON((0 0, 5 0, 5 5, 0 5, 0 0))')
) AS result;
-- Returns: 1 (yes, the point is within the square)

-- Point outside the polygon
SELECT ST_Within(
  ST_GeomFromText('POINT(10 10)'),
  ST_GeomFromText('POLYGON((0 0, 5 0, 5 5, 0 5, 0 0))')
) AS result;
-- Returns: 0
```

## Setting Up a Geofencing Table

```sql
CREATE TABLE zones (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100),
  boundary POLYGON NOT NULL SRID 4326,
  PRIMARY KEY (id),
  SPATIAL INDEX (boundary)
);

CREATE TABLE locations (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100),
  position POINT NOT NULL SRID 4326,
  PRIMARY KEY (id),
  SPATIAL INDEX (position)
);
```

## Inserting Sample Data

```sql
-- Insert a zone (rough bounding box for Manhattan)
INSERT INTO zones (name, boundary) VALUES (
  'Manhattan',
  ST_GeomFromText(
    'POLYGON((40.6979 -74.0201, 40.6979 -73.9076, 40.8785 -73.9076, 40.8785 -74.0201, 40.6979 -74.0201))',
    4326
  )
);

-- Insert location points
INSERT INTO locations (name, position) VALUES
('Times Square',    ST_GeomFromText('POINT(40.7580 -73.9855)', 4326)),
('Brooklyn Bridge', ST_GeomFromText('POINT(40.7061 -73.9969)', 4326)),
('Newark',          ST_GeomFromText('POINT(40.7357 -74.1724)', 4326));
```

## Find Which Locations Are Within a Zone

```sql
SELECT
  l.name AS location,
  z.name AS zone
FROM locations l
JOIN zones z ON ST_Within(l.position, z.boundary)
ORDER BY l.name;
```

## Check If a Single Point Is Within Any Zone

```sql
SET @point = ST_GeomFromText('POINT(40.7580 -73.9855)', 4326);

SELECT name
FROM zones
WHERE ST_Within(@point, boundary);
```

## Using ST_Within for Proximity Filtering

Combine with `ST_Buffer()` to create a circular geofence:

```sql
-- Find all locations within 10 km of a center point
SET @center = ST_GeomFromText('POINT(40.7128 -74.0060)', 4326);

SELECT name
FROM locations
WHERE ST_Within(
  position,
  ST_Buffer(@center, 10000)  -- 10,000 meters
);
```

Note: `ST_Buffer()` on SRID 4326 data behaves differently in MySQL 8.0+ (uses geodesic calculations).

## ST_Within vs ST_Contains

`ST_Within(g1, g2)` is equivalent to `ST_Contains(g2, g1)` - they are the inverse of each other:

```sql
-- These two are equivalent
SELECT ST_Within(point_geom, polygon_geom);
SELECT ST_Contains(polygon_geom, point_geom);
```

Use `ST_Contains()` when the first argument (the container) is an indexed column in your table, because the optimizer can use the spatial index on the first argument of `ST_Contains()`.

## Polygon Within a Polygon

```sql
-- Is a small square within a larger square?
SELECT ST_Within(
  ST_GeomFromText('POLYGON((1 1, 3 1, 3 3, 1 3, 1 1))'),
  ST_GeomFromText('POLYGON((0 0, 5 0, 5 5, 0 5, 0 0))')
) AS result;
-- Returns: 1
```

## Using MBRContains for Index Optimization

`ST_Within()` uses the spatial index via MBR (Minimum Bounding Rectangle) filtering:

```sql
-- MySQL uses the spatial index on boundary
SELECT l.name
FROM locations l, zones z
WHERE z.name = 'Manhattan'
  AND ST_Within(l.position, z.boundary);
```

## Handling NULL and Edge Cases

```sql
-- Point exactly on the boundary
SELECT ST_Within(
  ST_GeomFromText('POINT(0 0)'),
  ST_GeomFromText('POLYGON((0 0, 5 0, 5 5, 0 5, 0 0))')
) AS on_boundary;
-- Returns: 0 (boundary points are not considered within in MySQL 8.0+)

-- NULL input returns NULL
SELECT ST_Within(NULL, ST_GeomFromText('POLYGON((0 0, 5 0, 5 5, 0 5, 0 0))'));
-- Returns: NULL
```

## Summary

`ST_Within(g1, g2)` tests whether geometry g1 is completely contained inside geometry g2. It is ideal for geofencing, zone containment checks, and geographic point-in-polygon queries. For best performance, use a spatial index on the container geometry column and pair with `ST_Buffer()` to create radius-based zones. Remember that `ST_Within(a, b)` is equivalent to `ST_Contains(b, a)`.
