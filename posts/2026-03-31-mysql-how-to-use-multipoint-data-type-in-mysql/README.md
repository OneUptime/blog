# How to Use MULTIPOINT Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Data, MULTIPOINT, GIS, Data Type

Description: Learn how to store and query collections of geographic points using the MULTIPOINT data type in MySQL with practical GIS examples.

---

## What Is MULTIPOINT?

`MULTIPOINT` is a spatial data type in MySQL that stores a collection of `POINT` values. It is part of MySQL's GIS (Geographic Information System) support and follows the OpenGIS standard. Use it when a single entity has multiple associated geographic coordinates, such as a bus route with multiple stops or a customer with multiple delivery locations.

```sql
CREATE TABLE delivery_hubs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hub_name VARCHAR(100),
    drop_points MULTIPOINT NOT NULL,
    SPATIAL INDEX idx_drop_points (drop_points)
);
```

## Inserting MULTIPOINT Values

Use `ST_GeomFromText()` with WKT (Well-Known Text) format or `ST_MultiPointFromText()`:

```sql
-- Insert using WKT notation
INSERT INTO delivery_hubs (hub_name, drop_points)
VALUES (
    'Downtown Hub',
    ST_GeomFromText('MULTIPOINT((40.7128 -74.0060),(40.7580 -73.9855),(40.6892 -74.0445))')
);

-- Using ST_MultiPointFromText
INSERT INTO delivery_hubs (hub_name, drop_points)
VALUES (
    'Uptown Hub',
    ST_MultiPointFromText('MULTIPOINT((40.7831 -73.9712),(40.8004 -73.9590))')
);

-- Using ST_Collect aggregate function (MySQL 8.0.24+)
INSERT INTO delivery_hubs (hub_name, drop_points)
SELECT 'East Side Hub', ST_Collect(geom)
FROM (
    SELECT ST_PointFromText('POINT(40.7282 -73.7949)') AS geom
    UNION ALL
    SELECT ST_PointFromText('POINT(40.6501 -73.9496)')
) AS points;
```

## Querying MULTIPOINT Data

```sql
-- Retrieve as WKT for readability
SELECT hub_name, ST_AsText(drop_points) AS points_wkt
FROM delivery_hubs;

-- Get the number of points in the collection
SELECT hub_name, ST_NumGeometries(drop_points) AS num_points
FROM delivery_hubs;

-- Extract a specific point by index (1-based)
SELECT hub_name,
       ST_AsText(ST_GeometryN(drop_points, 1)) AS first_point,
       ST_AsText(ST_GeometryN(drop_points, 2)) AS second_point
FROM delivery_hubs;
```

## Spatial Queries with MULTIPOINT

```sql
-- Find hubs with any drop point within a bounding box
SELECT hub_name
FROM delivery_hubs
WHERE MBRContains(
    ST_GeomFromText('POLYGON((40.60 -74.10, 40.60 -73.90, 40.80 -73.90, 40.80 -74.10, 40.60 -74.10))'),
    drop_points
);

-- Find the bounding box (envelope) of all points
SELECT hub_name, ST_AsText(ST_Envelope(drop_points)) AS bounding_box
FROM delivery_hubs;

-- Check if a specific point is within the multipoint collection
SELECT hub_name
FROM delivery_hubs
WHERE ST_Contains(drop_points, ST_PointFromText('POINT(40.7128 -74.0060)'));
```

## Converting Between MULTIPOINT and Individual POINTS

```sql
-- Explode MULTIPOINT into individual rows using a recursive approach
-- Get each point as a separate row
SELECT
    hub_name,
    ST_AsText(ST_GeometryN(drop_points, n.num)) AS individual_point
FROM delivery_hubs
JOIN (
    SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) n ON n.num <= ST_NumGeometries(drop_points);

-- Calculate centroid of all points
SELECT hub_name, ST_AsText(ST_Centroid(drop_points)) AS centroid
FROM delivery_hubs;
```

## Working with SRID (Spatial Reference ID)

```sql
-- Insert with explicit SRID 4326 (WGS84 geographic coordinates)
INSERT INTO delivery_hubs (hub_name, drop_points)
VALUES (
    'West Hub',
    ST_GeomFromText('MULTIPOINT((40.7128 -74.0060),(40.7580 -73.9855))', 4326)
);

-- Create table with SRID constraint (MySQL 8.0+)
CREATE TABLE sensor_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_group VARCHAR(50),
    positions MULTIPOINT NOT NULL SRID 4326,
    SPATIAL INDEX idx_positions (positions)
);
```

## Summary

The `MULTIPOINT` data type enables efficient storage of collections of geographic coordinates in MySQL. Use it with `ST_GeomFromText()` for insertion and spatial functions like `ST_NumGeometries()`, `ST_GeometryN()`, and `ST_Centroid()` for querying. Add a `SPATIAL INDEX` to enable fast bounding-box searches. For precise geographic calculations, specify SRID 4326 (WGS84).
