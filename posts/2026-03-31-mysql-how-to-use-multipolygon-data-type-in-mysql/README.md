# How to Use MULTIPOLYGON Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Data, MULTIPOLYGON, GIS, Data Type

Description: Learn how to store and query collections of polygon geometries using the MULTIPOLYGON data type in MySQL for territory and region-based GIS applications.

---

## What Is MULTIPOLYGON?

`MULTIPOLYGON` is a spatial data type in MySQL that stores a collection of `POLYGON` geometries. It is used when a geographic entity consists of multiple, possibly non-contiguous, polygonal areas - such as a country with overseas territories, a tax district with multiple parcels, or a service zone with gaps.

```sql
CREATE TABLE service_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(100),
    coverage MULTIPOLYGON NOT NULL,
    SPATIAL INDEX idx_coverage (coverage)
);
```

## Inserting MULTIPOLYGON Values

Each polygon in the MULTIPOLYGON is defined by one or more rings (exterior + optional interior holes), and the first and last points must match to close the ring:

```sql
-- Insert a MULTIPOLYGON with two separate polygons
INSERT INTO service_zones (zone_name, coverage)
VALUES (
    'Metro Zone A',
    ST_GeomFromText('MULTIPOLYGON(
        ((0 0, 0 10, 10 10, 10 0, 0 0)),
        ((20 20, 20 30, 30 30, 30 20, 20 20))
    )')
);

-- Using ST_MultiPolygonFromText
INSERT INTO service_zones (zone_name, coverage)
VALUES (
    'Harbor District',
    ST_MultiPolygonFromText('MULTIPOLYGON(
        ((1 1, 1 5, 5 5, 5 1, 1 1)),
        ((7 7, 7 12, 12 12, 12 7, 7 7))
    )')
);

-- With geographic coordinates (WGS84 SRID 4326)
INSERT INTO service_zones (zone_name, coverage)
VALUES (
    'Downtown Delivery Zone',
    ST_GeomFromText('MULTIPOLYGON(
        ((40.705 -74.010, 40.720 -74.010, 40.720 -73.990, 40.705 -73.990, 40.705 -74.010)),
        ((40.730 -73.975, 40.745 -73.975, 40.745 -73.955, 40.730 -73.955, 40.730 -73.975))
    )', 4326)
);
```

## Querying MULTIPOLYGON Data

```sql
-- Retrieve as human-readable WKT
SELECT zone_name, ST_AsText(coverage) AS coverage_wkt
FROM service_zones;

-- Get number of polygons in the collection
SELECT zone_name, ST_NumGeometries(coverage) AS num_polygons
FROM service_zones;

-- Get total area of all polygons
SELECT zone_name, ST_Area(coverage) AS total_area
FROM service_zones;

-- Extract a specific polygon by index (1-based)
SELECT zone_name,
       ST_AsText(ST_GeometryN(coverage, 1)) AS first_polygon
FROM service_zones;

-- Get GeoJSON for use in mapping libraries
SELECT zone_name, ST_AsGeoJSON(coverage) AS geojson
FROM service_zones;
```

## Spatial Containment and Intersection Queries

```sql
-- Check if a point is inside any polygon in the MULTIPOLYGON
SELECT zone_name
FROM service_zones
WHERE ST_Contains(coverage, ST_PointFromText('POINT(5 5)'));

-- Find zones that overlap with a given area
SELECT zone_name
FROM service_zones
WHERE ST_Intersects(
    coverage,
    ST_GeomFromText('POLYGON((0 0, 0 25, 25 25, 25 0, 0 0))')
);

-- Find zones that fully contain a given polygon
SELECT zone_name
FROM service_zones
WHERE ST_Contains(
    coverage,
    ST_GeomFromText('POLYGON((1 1, 1 4, 4 4, 4 1, 1 1))')
);
```

## Real-World Use Case - Delivery Coverage

```sql
CREATE TABLE delivery_regions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrier VARCHAR(50),
    region_name VARCHAR(100),
    area MULTIPOLYGON NOT NULL SRID 4326,
    SPATIAL INDEX idx_area (area)
);

-- Check which carriers cover a customer's location
SELECT carrier, region_name
FROM delivery_regions
WHERE ST_Contains(
    area,
    ST_PointFromText('POINT(40.748 -73.985)', 4326)
);

-- Find the union of two carrier zones
SELECT
    ST_AsText(
        ST_Union(
            (SELECT area FROM delivery_regions WHERE carrier = 'FastShip'),
            (SELECT area FROM delivery_regions WHERE carrier = 'QuickDeliver')
        )
    ) AS combined_coverage;
```

## Calculating Distances and Relationships

```sql
-- Calculate distance between zone centroid and a point
SELECT
    zone_name,
    ST_Distance_Sphere(
        ST_Centroid(coverage),
        ST_PointFromText('POINT(40.712 -74.006)', 4326)
    ) AS distance_meters
FROM service_zones
ORDER BY distance_meters
LIMIT 3;

-- Get the centroid of each MULTIPOLYGON
SELECT zone_name, ST_AsText(ST_Centroid(coverage)) AS centroid
FROM service_zones;

-- Check if two zones overlap
SELECT a.zone_name AS zone1, b.zone_name AS zone2
FROM service_zones a
JOIN service_zones b ON a.id < b.id
WHERE ST_Overlaps(a.coverage, b.coverage);
```

## Summary

The `MULTIPOLYGON` data type is the appropriate choice for geographic entities that span multiple non-contiguous polygonal areas. Use `ST_GeomFromText()` with WKT notation to insert data, and leverage spatial functions like `ST_Contains()`, `ST_Intersects()`, and `ST_Area()` for geographic analysis. Always add a `SPATIAL INDEX` on MULTIPOLYGON columns to enable efficient bounding-box filtering in production queries.
