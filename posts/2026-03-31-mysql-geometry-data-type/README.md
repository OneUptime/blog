# How to Use GEOMETRY Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Spatial, GIS

Description: Learn how to use the GEOMETRY data type in MySQL to store and query spatial data including points, lines, and polygons with practical GIS examples.

---

## What Is the GEOMETRY Data Type

`GEOMETRY` is MySQL's base spatial data type that can store any geometric shape: `POINT`, `LINESTRING`, `POLYGON`, `MULTIPOINT`, `MULTILINESTRING`, `MULTIPOLYGON`, or `GEOMETRYCOLLECTION`.

Spatial data in MySQL conforms to the OpenGIS specification. Columns of type `GEOMETRY` accept any of the above subtypes, making the type flexible when you need to store mixed geometric data.

## Setting Up a Spatial Table

```sql
CREATE TABLE locations (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    geom     GEOMETRY NOT NULL SRID 4326,
    SPATIAL INDEX idx_geom (geom)
);
```

The `SRID 4326` specifies the WGS 84 geographic coordinate system (latitude/longitude used by GPS).

## Inserting Geometry Data

```sql
-- Insert a POINT using WKT (Well-Known Text)
INSERT INTO locations (name, category, geom)
VALUES ('Eiffel Tower', 'landmark', ST_GeomFromText('POINT(48.8584 2.2945)', 4326));

-- Insert a LINESTRING (e.g., a road)
INSERT INTO locations (name, category, geom)
VALUES ('Main Street', 'road',
    ST_GeomFromText('LINESTRING(48.85 2.29, 48.86 2.30, 48.87 2.31)', 4326));

-- Insert a POLYGON (e.g., a park boundary)
INSERT INTO locations (name, category, geom)
VALUES ('City Park', 'park',
    ST_GeomFromText('POLYGON((48.84 2.28, 48.84 2.30, 48.86 2.30, 48.86 2.28, 48.84 2.28))', 4326));
```

## Querying Spatial Data

```sql
-- Retrieve geometry as WKT text
SELECT name, ST_AsText(geom) AS wkt FROM locations;

-- Get geometry type
SELECT name, ST_GeometryType(geom) AS type FROM locations;

-- Get coordinates of a POINT
SELECT name, ST_X(geom) AS latitude, ST_Y(geom) AS longitude
FROM locations
WHERE ST_GeometryType(geom) = 'POINT';
```

## Proximity Search

Find all locations within 1 km of the Eiffel Tower:

```sql
SET @tower = ST_GeomFromText('POINT(48.8584 2.2945)', 4326);

SELECT
    name,
    category,
    ST_Distance_Sphere(geom, @tower) AS distance_meters
FROM locations
WHERE ST_Distance_Sphere(geom, @tower) <= 1000
  AND ST_GeometryType(geom) = 'POINT'
ORDER BY distance_meters;
```

## Bounding Box Intersection

```sql
SET @search_area = ST_GeomFromText(
    'POLYGON((48.84 2.28, 48.84 2.32, 48.87 2.32, 48.87 2.28, 48.84 2.28))', 4326);

SELECT name, ST_AsText(geom)
FROM locations
WHERE MBRIntersects(geom, @search_area);
```

## Checking and Converting Geometries

```sql
-- Convert WKB (binary) to WKT for readability
SELECT name, ST_AsText(geom) FROM locations;

-- Check if a point is within a polygon
SELECT name FROM locations AS l1, locations AS l2
WHERE l2.name = 'City Park'
  AND ST_GeometryType(l1.geom) = 'POINT'
  AND ST_Within(l1.geom, l2.geom);

-- Calculate area of polygons (returns area in square meters for geographic SRS)
SELECT name, ST_Area(geom) AS area_approx
FROM locations
WHERE ST_GeometryType(geom) = 'POLYGON';
```

## GEOMETRY vs Specific Subtypes

| Type | Stores |
|---|---|
| GEOMETRY | Any spatial type |
| POINT | A single coordinate |
| LINESTRING | A sequence of points (path) |
| POLYGON | A closed ring of points (area) |

Use `GEOMETRY` when a column needs to store mixed geometry types. Use specific subtypes (`POINT`, `LINESTRING`, `POLYGON`) when all rows will hold the same shape type - this enforces data integrity.

## Summary

`GEOMETRY` is MySQL's flexible spatial type that accepts any OpenGIS shape. Pair it with a `SPATIAL INDEX` and the appropriate `SRID` for efficient geographic queries. Use `ST_Distance_Sphere` for real-world distance calculations in meters and `ST_Within` or `MBRIntersects` for containment and overlap checks. For columns that always store the same shape, use the specific subtype instead for stricter schema validation.
