# What Is a MySQL Spatial Index

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Index, GIS, Geospatial, R-Tree, InnoDB

Description: Learn what a MySQL spatial index is, how R-tree indexing works on geometry columns, and how to use spatial queries efficiently.

---

## What Is a Spatial Index

A spatial index is a special index type in MySQL designed for efficient querying of geometric and geographic data. MySQL uses an R-tree (Rectangle-tree) data structure for spatial indexes, which groups nearby geometric objects into bounding rectangles at multiple levels, enabling fast spatial range queries and proximity searches.

Spatial indexes are supported on `GEOMETRY`, `POINT`, `LINESTRING`, `POLYGON`, and other geometry column types.

## Why Regular Indexes Do Not Work for Spatial Data

A B-tree index is designed for one-dimensional ordered data. It cannot efficiently handle two-dimensional spatial queries like "find all locations within 10 km of this point" because spatial data has extent in multiple dimensions simultaneously.

The R-tree used by spatial indexes organizes objects by their minimum bounding rectangles, enabling fast pruning of regions that cannot overlap the search area.

## Creating a Table with a Spatial Index

```sql
CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  location POINT NOT NULL SRID 4326,
  SPATIAL INDEX idx_location (location)
);
```

The `SRID 4326` specifies the WGS 84 coordinate reference system used by GPS. In MySQL 8.0+, spatial indexes on columns with an explicit SRID enable geographically accurate distance and area calculations.

## Inserting Spatial Data

```sql
-- Insert a point using ST_GeomFromText
INSERT INTO stores (name, location)
VALUES ('Downtown', ST_GeomFromText('POINT(37.7749 -122.4194)', 4326));

-- Using ST_PointFromText
INSERT INTO stores (name, location)
VALUES ('Airport', ST_PointFromText('POINT(37.6213 -122.3790)', 4326));
```

## Querying with Spatial Functions

Find stores within a bounding box using `MBRContains`:

```sql
-- Find points within a rectangle (bounding box query - uses spatial index)
SELECT id, name
FROM stores
WHERE MBRContains(
  ST_GeomFromText('POLYGON((37.7 -122.5, 37.8 -122.5, 37.8 -122.4, 37.7 -122.4, 37.7 -122.5))', 4326),
  location
);
```

Find stores within a certain distance (radius search):

```sql
-- Find stores within 5 km of a given point (MySQL 8.0+ with SRID)
SELECT id, name,
  ST_Distance_Sphere(location, ST_PointFromText('POINT(37.7749 -122.4194)', 4326)) AS distance_m
FROM stores
WHERE ST_Distance_Sphere(location, ST_PointFromText('POINT(37.7749 -122.4194)', 4326)) < 5000
ORDER BY distance_m;
```

For better performance, first filter with a bounding box (which uses the spatial index), then filter by exact distance:

```sql
SET @center = ST_PointFromText('POINT(37.7749 -122.4194)', 4326);
SET @radius_m = 5000;  -- 5 km in meters (requires MySQL 8.0.26+)

SELECT id, name,
  ST_Distance_Sphere(location, @center) AS distance_m
FROM stores
WHERE MBRContains(
  ST_Buffer(@center, @radius_m),
  location
)
AND ST_Distance_Sphere(location, @center) < 5000
ORDER BY distance_m;
```

## Adding a Spatial Index to an Existing Table

```sql
ALTER TABLE stores ADD SPATIAL INDEX idx_location (location);
```

Note that the column must be declared NOT NULL for a spatial index to be created on it.

## Checking Spatial Index Usage

Verify that MySQL uses the spatial index in query execution:

```sql
EXPLAIN SELECT id, name
FROM stores
WHERE MBRContains(
  ST_GeomFromText('POLYGON((37.7 -122.5, 37.8 -122.5, 37.8 -122.4, 37.7 -122.4, 37.7 -122.5))', 4326),
  location
)\G
```

Look for the spatial index name in the `key` column of the EXPLAIN output.

## Supported Geometry Types

```sql
-- POINT: a single coordinate
location POINT NOT NULL SRID 4326

-- POLYGON: an area boundary
area POLYGON NOT NULL SRID 0

-- LINESTRING: a path
route LINESTRING NOT NULL SRID 0

-- GEOMETRY: accepts any geometry type
shape GEOMETRY NOT NULL SRID 0
```

## Summary

A MySQL spatial index uses an R-tree data structure to efficiently index two-dimensional geometric data. It is essential for geographic queries like proximity searches, bounding box filters, and polygon containment checks. By creating a `SPATIAL INDEX` on a `GEOMETRY` or `POINT` column with an appropriate SRID, MySQL can quickly prune the search space using minimum bounding rectangles before applying precise geometric calculations.
