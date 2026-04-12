# How to Use MULTILINESTRING Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Data, MULTILINESTRING, GIS, Data Type

Description: Learn how to store and query collections of line geometries using the MULTILINESTRING data type in MySQL for GIS and mapping applications.

---

## What Is MULTILINESTRING?

`MULTILINESTRING` is a spatial data type in MySQL that stores a collection of `LINESTRING` geometries. It is ideal for representing complex linear features made up of multiple disconnected line segments, such as a road network, river system, or transit routes.

```sql
CREATE TABLE road_segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    road_name VARCHAR(100),
    route MULTILINESTRING NOT NULL,
    SPATIAL INDEX idx_route (route)
);
```

## Inserting MULTILINESTRING Values

Use WKT (Well-Known Text) format with `ST_GeomFromText()`:

```sql
-- A road with two separate segments (e.g., interrupted by a bridge)
INSERT INTO road_segments (road_name, route)
VALUES (
    'Highway 1',
    ST_GeomFromText('MULTILINESTRING((0 0, 10 0, 20 10),(30 10, 40 20, 50 20))')
);

-- Using ST_MultiLineStringFromText
INSERT INTO road_segments (road_name, route)
VALUES (
    'River Trail',
    ST_MultiLineStringFromText('MULTILINESTRING((1 1, 2 3, 3 3),(5 5, 7 7, 9 6))')
);

-- Insert with coordinate values (no SRID, treated as Cartesian)
INSERT INTO road_segments (road_name, route)
VALUES (
    'City Loop',
    ST_GeomFromText(
        'MULTILINESTRING((-74.006 40.712, -73.985 40.758),(-73.971 40.783, -73.959 40.800))'
    )
);
```

## Querying MULTILINESTRING Data

```sql
-- Get WKT representation
SELECT road_name, ST_AsText(route) AS route_wkt
FROM road_segments;

-- Get GeoJSON representation
SELECT road_name, ST_AsGeoJSON(route) AS route_geojson
FROM road_segments;

-- Count the number of line segments
SELECT road_name, ST_NumGeometries(route) AS num_segments
FROM road_segments;

-- Get total length of all line segments combined
SELECT road_name, ST_Length(route) AS total_length
FROM road_segments;

-- Extract a specific linestring by index (1-based)
SELECT road_name,
       ST_AsText(ST_GeometryN(route, 1)) AS first_segment
FROM road_segments;
```

## Spatial Filtering

```sql
-- Find roads that intersect a given polygon area
SELECT road_name
FROM road_segments
WHERE ST_Intersects(
    route,
    ST_GeomFromText('POLYGON((0 0, 0 15, 25 15, 25 0, 0 0))')
);

-- Find roads within a bounding box using MBR
SELECT road_name
FROM road_segments
WHERE MBRIntersects(
    route,
    ST_GeomFromText('POLYGON((-74.1 40.6, -74.1 40.9, -73.9 40.9, -73.9 40.6, -74.1 40.6))')
);

-- Get the bounding envelope of a route
SELECT road_name, ST_AsText(ST_Envelope(route)) AS bounding_box
FROM road_segments;
```

## Combining MULTILINESTRING with Other Operations

```sql
-- Get the convex hull enclosing all segments
SELECT road_name, ST_AsText(ST_ConvexHull(route)) AS convex_hull
FROM road_segments;

-- Get the start and end points of the first segment
SELECT
    road_name,
    ST_AsText(ST_StartPoint(ST_GeometryN(route, 1))) AS segment1_start,
    ST_AsText(ST_EndPoint(ST_GeometryN(route, 1)))   AS segment1_end
FROM road_segments;

-- Check if a route is simple (no self-intersections)
SELECT road_name, ST_IsSimple(route) AS is_simple
FROM road_segments;
```

## Practical Use Case - Transit Routes

```sql
CREATE TABLE transit_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_name VARCHAR(50),
    direction ENUM('northbound', 'southbound', 'eastbound', 'westbound'),
    path MULTILINESTRING NOT NULL SRID 4326,
    SPATIAL INDEX idx_path (path)
);

INSERT INTO transit_routes (line_name, direction, path)
VALUES (
    'Line A',
    'northbound',
    ST_GeomFromText(
        'MULTILINESTRING((-74.006 40.712, -74.006 40.730),(-74.006 40.735, -74.006 40.758))',
        4326
    )
);

-- Find all routes near a specific location (within approximate bounding box)
SELECT line_name, direction
FROM transit_routes
WHERE ST_Distance_Sphere(
    ST_Centroid(path),
    ST_PointFromText('POINT(-74.006 40.730)', 4326)
) < 1000;  -- within 1000 meters
```

## Summary

The `MULTILINESTRING` data type is the right choice when a geographic feature consists of multiple disconnected line segments. Use `ST_GeomFromText()` with WKT notation for insertions, and spatial functions like `ST_Length()`, `ST_NumGeometries()`, and `ST_Intersects()` for analysis. Add a `SPATIAL INDEX` for efficient bounding-box queries in large datasets.
