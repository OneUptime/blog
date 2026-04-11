# How to Use ST_MakeEnvelope() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_MakeEnvelope() function to create a rectangular bounding box polygon from two corner points for spatial queries.

---

## What is ST_MakeEnvelope()?

`ST_MakeEnvelope(pt1, pt2)` constructs a rectangular polygon from two corner points. This is the most convenient way to define a bounding box for spatial range queries - for example, finding all points within a visible map viewport or a rectangular search area.

It was introduced in MySQL 5.7.6 as a simpler alternative to manually constructing bounding box polygons.

## Basic Syntax

```sql
ST_MakeEnvelope(point1, point2)
```

Both arguments must be `POINT` geometries with the same SRID. The function only supports Cartesian spatial reference systems (such as SRID 0); geographic SRIDs like 4326 (WGS 84) are not supported and will raise an `ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS` error. Returns a `POLYGON` with five points forming the rectangle (or a `POINT` if both points are equal, or a `LINESTRING` if they are collinear).

## Creating a Simple Bounding Box

```sql
SELECT ST_AsText(
  ST_MakeEnvelope(
    ST_GeomFromText('POINT(0 0)', 0),
    ST_GeomFromText('POINT(10 5)', 0)
  )
) AS envelope;
```

```text
+------------------------------------------+
| envelope                                 |
+------------------------------------------+
| POLYGON((0 0,10 0,10 5,0 5,0 0))        |
+------------------------------------------+
```

## Practical Example: Spatial Range Query

Find all points of interest within a rectangular region using Cartesian coordinates:

```sql
CREATE TABLE pois (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  location POINT NOT NULL SRID 0,
  SPATIAL INDEX (location)
);

INSERT INTO pois (name, location) VALUES
  ('Warehouse A', ST_GeomFromText('POINT(50 80)', 0)),
  ('Warehouse B', ST_GeomFromText('POINT(150 200)', 0)),
  ('Warehouse C', ST_GeomFromText('POINT(300 400)', 0));

-- Find POIs within a rectangular search area
SELECT name
FROM pois
WHERE ST_Within(
  location,
  ST_MakeEnvelope(
    ST_GeomFromText('POINT(0 0)', 0),
    ST_GeomFromText('POINT(200 250)', 0)
  )
);
```

This returns Warehouse A and Warehouse B, which fall inside the bounding box.

## Using ST_MakeEnvelope with MBRContains

For index-accelerated bounding box queries, combine with `MBRContains()`:

```sql
SELECT name
FROM pois
WHERE MBRContains(
  ST_MakeEnvelope(
    ST_GeomFromText('POINT(0 0)', 0),
    ST_GeomFromText('POINT(200 250)', 0)
  ),
  location
);
```

`MBRContains()` uses the spatial R-tree index efficiently, making this approach much faster for large tables.

## ST_MakeEnvelope vs Manual Polygon Construction

Before `ST_MakeEnvelope()`, you had to construct bounding boxes manually:

```sql
-- Old approach: verbose polygon construction
ST_GeomFromText('POLYGON((0 0, 10 0, 10 5, 0 5, 0 0))', 0)

-- New approach: ST_MakeEnvelope
ST_MakeEnvelope(
  ST_GeomFromText('POINT(0 0)', 0),
  ST_GeomFromText('POINT(10 5)', 0)
)
```

Both produce identical results, but `ST_MakeEnvelope()` is cleaner and less error-prone.

## SRID Requirements

Both points must share the same SRID, and it must be a Cartesian SRS (not a geographic SRS like 4326):

```sql
-- This raises an error: SRID mismatch
SELECT ST_MakeEnvelope(
  ST_GeomFromText('POINT(0 0)', 0),
  ST_GeomFromText('POINT(10 5)', 2154)
);

-- This raises an error: geographic SRS not supported
SELECT ST_MakeEnvelope(
  ST_GeomFromText('POINT(0 0)', 4326),
  ST_GeomFromText('POINT(10 5)', 4326)
);
```

## Summary

`ST_MakeEnvelope()` creates a rectangular bounding box polygon from two corner points using Cartesian coordinates (SRID 0 or a projected SRS). It is the most readable and concise way to define spatial search rectangles in MySQL. Use it with `ST_Within()` for point-in-rectangle queries or with `MBRContains()` to leverage the spatial R-tree index for high-performance bounding box searches. Note that it does not support geographic SRIDs like 4326.
