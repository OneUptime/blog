# How to Use ST_Distance() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Functions, GIS, Geospatial, Distance Calculation

Description: Learn how to use MySQL's ST_Distance() function to calculate the distance between two geometry objects, with examples for points, SRIDs, and proximity queries.

---

## What Is ST_Distance()?

`ST_Distance()` is a MySQL spatial function that calculates the distance between two geometry objects. It returns the shortest distance between any two points in the two geometries.

In MySQL 8.0+, `ST_Distance()` is SRID-aware and returns results in the units of the spatial reference system (e.g., meters for SRID 4326).

## Syntax

```sql
ST_Distance(g1, g2 [, unit])
```

- `g1`, `g2` - Two geometry values
- `unit` - Optional unit name (e.g., `'metre'`, `'foot'`, `'kilometre'`) - MySQL 8.0.14+

## Basic Example - Cartesian Distance

```sql
SELECT ST_Distance(
  ST_GeomFromText('POINT(0 0)'),
  ST_GeomFromText('POINT(3 4)')
) AS distance;
-- Returns: 5 (Pythagorean theorem: sqrt(3^2 + 4^2))
```

## Geographic Distance With SRID 4326

For real-world GPS coordinates, use SRID 4326 (WGS 84) to get results in meters:

```sql
SELECT ST_Distance(
  ST_GeomFromText('POINT(40.7128 -74.0060)', 4326),   -- New York City
  ST_GeomFromText('POINT(51.5074 -0.1278)', 4326)     -- London
) AS distance_meters;
```

This returns the distance in meters (approximately 5,570,000 meters).

## Specifying Units (MySQL 8.0.14+)

```sql
SELECT ST_Distance(
  ST_GeomFromText('POINT(40.7128 -74.0060)', 4326),
  ST_GeomFromText('POINT(51.5074 -0.1278)', 4326),
  'kilometre'
) AS distance_km;
```

Available units include: `'metre'`, `'kilometre'`, `'foot'`, `'Statute mile'`, `'nautical mile'`. You can query `SELECT * FROM INFORMATION_SCHEMA.ST_UNITS_OF_MEASURE WHERE UNIT_TYPE = 'LINEAR'` for the full list.

## Distance Between Points Stored in a Table

```sql
CREATE TABLE locations (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100),
  position POINT NOT NULL SRID 4326,
  PRIMARY KEY (id),
  SPATIAL INDEX (position)
);

INSERT INTO locations (name, position) VALUES
('New York',  ST_GeomFromText('POINT(40.7128 -74.0060)', 4326)),
('Los Angeles', ST_GeomFromText('POINT(34.0522 -118.2437)', 4326)),
('Chicago',   ST_GeomFromText('POINT(41.8781 -87.6298)', 4326));
```

Find distance from New York to all other cities:

```sql
SELECT
  b.name,
  ROUND(ST_Distance(a.position, b.position) / 1000, 1) AS distance_km
FROM locations a
JOIN locations b ON a.id != b.id
WHERE a.name = 'New York'
ORDER BY distance_km;
```

## Finding Nearby Locations (Proximity Query)

Find all locations within 500 km of a given point:

```sql
SET @origin = ST_GeomFromText('POINT(40.7128 -74.0060)', 4326);

SELECT
  name,
  ROUND(ST_Distance(position, @origin) / 1000, 1) AS distance_km
FROM locations
WHERE ST_Distance(position, @origin) < 500000  -- 500 km in meters
ORDER BY ST_Distance(position, @origin);
```

For better performance with large tables, combine with `ST_Within()` or `MBRContains()` to use the spatial index. Note: `ST_Buffer()` with geographic SRS (SRID 4326) requires MySQL 8.0.26+ and only supports Point geometries:

```sql
SET @center = ST_GeomFromText('POINT(40.7128 -74.0060)', 4326);
SET @radius_m = 500000;  -- 500 km

SELECT name, ROUND(ST_Distance(position, @center) / 1000, 1) AS km
FROM locations
WHERE ST_Within(position, ST_Buffer(@center, @radius_m))
ORDER BY km;
```

## Distance Between Non-Point Geometries

`ST_Distance()` works between any two geometry types:

```sql
-- Distance from a point to a linestring
SELECT ST_Distance(
  ST_GeomFromText('POINT(2 2)'),
  ST_GeomFromText('LINESTRING(0 0, 5 0)')
) AS dist;
-- Returns: 2 (perpendicular distance from point to line)

-- Distance between two polygons
SELECT ST_Distance(
  ST_GeomFromText('POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))'),
  ST_GeomFromText('POLYGON((5 0, 7 0, 7 2, 5 2, 5 0))')
) AS dist;
-- Returns: 3 (gap between the two rectangles)
```

## ST_Distance_Sphere() - Spherical Alternative

`ST_Distance_Sphere()` is another option for distance calculations between POINT (or MultiPoint) objects. It uses a spherical Earth model rather than the ellipsoidal model used by `ST_Distance()` with SRID 4326, making it slightly less accurate but still useful:

```sql
SELECT ST_Distance_Sphere(
  ST_GeomFromText('POINT(-74.0060 40.7128)'),
  ST_GeomFromText('POINT(-0.1278 51.5074)')
) / 1000 AS distance_km;
```

Note: `ST_Distance_Sphere()` uses longitude/latitude order (X=longitude, Y=latitude). `ST_Distance()` with SRID 4326 uses latitude/longitude order.

## Summary

`ST_Distance()` in MySQL calculates the shortest distance between two geometry objects. In MySQL 8.0+, use SRID 4326 for geographic (real-world) distance calculations in meters, and optionally specify a unit like `'kilometre'`. For proximity queries on large tables, combine `ST_Distance()` with `ST_Buffer()` and `ST_Within()` to take advantage of spatial indexes.
