# How to Create Spatial Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Index, GIS, Performance

Description: Learn how to create and use spatial indexes in MySQL to speed up geographic queries on geometry columns with practical examples.

---

## What Are Spatial Indexes

Spatial indexes in MySQL are specialized indexes for geometry columns. They use an R-tree data structure (as opposed to B-tree used for regular indexes) to efficiently store and query spatial data such as points, lines, and polygons.

Spatial indexes dramatically improve the performance of spatial queries involving functions like `ST_Contains()`, `ST_Intersects()`, and `MBRContains()`.

## Requirements for Spatial Indexes

Before creating a spatial index, you must ensure:

1. The column type is one of the spatial types: `GEOMETRY`, `POINT`, `LINESTRING`, `POLYGON`, etc.
2. The column is declared `NOT NULL`.
3. The storage engine is InnoDB (MySQL 5.7+) or MyISAM.

## Creating a Spatial Index at Table Creation

The most common approach is to define the spatial index when creating the table:

```sql
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  coords POINT NOT NULL,
  SPATIAL INDEX(coords)
);
```

## Adding a Spatial Index to an Existing Table

You can add a spatial index to an existing table using `ALTER TABLE` or `CREATE INDEX`:

```sql
-- Using ALTER TABLE
ALTER TABLE locations ADD SPATIAL INDEX idx_coords (coords);

-- Using CREATE INDEX
CREATE SPATIAL INDEX idx_coords ON locations (coords);
```

## Inserting Spatial Data

Insert data into a spatially indexed table:

```sql
INSERT INTO locations (name, coords) VALUES
  ('Office A', ST_GeomFromText('POINT(37.7749 -122.4194)')),
  ('Office B', ST_GeomFromText('POINT(34.0522 -118.2437)')),
  ('Warehouse', ST_GeomFromText('POINT(41.8781 -87.6298)'));
```

## Querying with Spatial Index

Use `MBRContains()` or `ST_Contains()` with a bounding box to leverage the spatial index:

```sql
-- Find all locations within a bounding box
SET @bbox = ST_GeomFromText('POLYGON((37 -123, 37 -122, 38 -122, 38 -123, 37 -123))');

SELECT name, ST_AsText(coords)
FROM locations
WHERE MBRContains(@bbox, coords);
```

The `MBRContains()` function uses the Minimum Bounding Rectangle and is index-friendly.

## Verifying the Index is Used

Use `EXPLAIN` to confirm the spatial index is being utilized:

```sql
EXPLAIN SELECT name
FROM locations
WHERE MBRContains(
  ST_GeomFromText('POLYGON((37 -123, 37 -122, 38 -122, 38 -123, 37 -123))'),
  coords
);
```

Look for `key: idx_coords` in the output to confirm index usage:

```text
+----+-------------+-----------+-------+---------------+-----------+
| id | select_type | table     | type  | key           | rows      |
+----+-------------+-----------+-------+---------------+-----------+
|  1 | SIMPLE      | locations | range | idx_coords    |     1     |
+----+-------------+-----------+-------+---------------+-----------+
```

## Dropping a Spatial Index

```sql
ALTER TABLE locations DROP INDEX idx_coords;
-- or
DROP INDEX idx_coords ON locations;
```

## Common Pitfalls

- Spatial indexes do not support NULL values - the column must be NOT NULL.
- Not all spatial functions are index-aware. `MBRContains()` uses the index; `ST_Distance()` does not directly.
- On large datasets, use bounding box pre-filters before applying exact spatial predicates.

```sql
-- Efficient pattern: bounding box first, then exact filter
SELECT name
FROM locations
WHERE MBRContains(@bbox, coords)
  AND ST_Distance(coords, ST_GeomFromText('POINT(37.7749 -122.4194)')) < 10;
```

## Summary

Spatial indexes in MySQL use R-tree structures to optimize geographic queries. Define them with `SPATIAL INDEX` at creation time or add them later with `ALTER TABLE`. Always ensure geometry columns are `NOT NULL`, and use `MBRContains()` for index-friendly bounding box queries before applying more expensive exact spatial functions.
