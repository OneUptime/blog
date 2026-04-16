# How to Use Geo Data Types (Point, Ring, Polygon) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geo Data Types, Geospatial, Point, Polygon, Analytics

Description: Learn how to store and query geospatial data using ClickHouse's Point, Ring, Polygon, and MultiPolygon types with practical geographic query examples.

---

## Overview of Geo Data Types

ClickHouse provides native geo data types for storing geometric shapes and coordinates. These types are built on top of tuples and arrays:

| Type | Underlying Type | Description |
|------|----------------|-------------|
| `Point` | `Tuple(Float64, Float64)` | A pair of Float64 coordinates (order is up to you) |
| `Ring` | `Array(Point)` | A closed polygon ring |
| `Polygon` | `Array(Ring)` | A polygon with optional holes |
| `MultiPolygon` | `Array(Polygon)` | Multiple polygons |

```sql
-- Enable geo types (required in some versions)
SET allow_experimental_geo_types = 1;

CREATE TABLE geo_locations (
    id UInt64,
    name String,
    location Point,
    boundary Ring,
    zone Polygon
) ENGINE = MergeTree()
ORDER BY id;
```

## Working with Point

ClickHouse's `Point` is just a `Tuple(Float64, Float64)` — the axis order is a convention you choose. This post stores coordinates as `(latitude, longitude)`. Note that ClickHouse geo functions like `greatCircleDistance` expect `(longitude, latitude)` ordering, so we pass the tuple elements in the right order at call time:

```sql
-- Insert points
INSERT INTO geo_locations (id, name, location) VALUES
    (1, 'New York',    (40.7128, -74.0060)),
    (2, 'London',      (51.5074, -0.1278)),
    (3, 'Tokyo',       (35.6762, 139.6503)),
    (4, 'Sydney',      (-33.8688, 151.2093));

-- Query coordinates
SELECT
    name,
    location.1 AS latitude,
    location.2 AS longitude
FROM geo_locations;

-- Using tuple element access
SELECT name, tupleElement(location, 1) AS lat
FROM geo_locations;
```

## Calculating Distance Between Points

Use `greatCircleDistance` for distance calculations:

```sql
-- Distance between two points in meters
SELECT
    a.name AS city_a,
    b.name AS city_b,
    round(greatCircleDistance(
        a.location.2, a.location.1,
        b.location.2, b.location.1
    ) / 1000, 0) AS distance_km
FROM geo_locations a
CROSS JOIN geo_locations b
WHERE a.name < b.name
ORDER BY distance_km;
```

```sql
-- Find all locations within 500km of a reference point
SELECT name, round(greatCircleDistance(
    location.2, location.1,
    -74.0060, 40.7128  -- New York
) / 1000) AS km_from_nyc
FROM geo_locations
WHERE greatCircleDistance(
    location.2, location.1,
    -74.0060, 40.7128
) < 500000
ORDER BY km_from_nyc;
```

## Working with Ring

A `Ring` is a closed polygon boundary (sequence of points):

```sql
-- Insert a ring representing a city boundary
INSERT INTO geo_locations (id, name, location, boundary) VALUES
(5, 'Central Park', (40.7851, -73.9683), [
    (40.7641, -73.9732),
    (40.7641, -73.9491),
    (40.8008, -73.9491),
    (40.8008, -73.9732),
    (40.7641, -73.9732)  -- close the ring
]);

-- Check if a point is inside a ring using pointInPolygon
SELECT
    name,
    pointInPolygon((40.7750, -73.9600), boundary) AS is_inside
FROM geo_locations
WHERE length(boundary) > 0;
```

## Working with Polygon

A `Polygon` is an array of rings - the first ring is the outer boundary, subsequent rings are holes:

```sql
-- Create a polygon with no holes (simple polygon)
INSERT INTO geo_locations (id, name, location, zone) VALUES
(6, 'District Zone', (40.7128, -74.0060), [
    [   -- outer boundary ring
        (40.7000, -74.0200),
        (40.7000, -73.9800),
        (40.7300, -73.9800),
        (40.7300, -74.0200),
        (40.7000, -74.0200)
    ]
]);

-- Point-in-polygon test
SELECT
    name,
    pointInPolygon((40.7150, -74.0100), zone) AS point_in_zone
FROM geo_locations
WHERE length(zone) > 0;
```

## Using pointInPolygon for Geo-Fencing

```sql
CREATE TABLE delivery_orders (
    order_id UInt64,
    customer_lat Float64,
    customer_lon Float64,
    order_time DateTime
) ENGINE = MergeTree()
ORDER BY order_time;

-- Define service zone as polygon
-- Check if customer is in delivery zone
SELECT
    order_id,
    pointInPolygon(
        (customer_lat, customer_lon),
        [
            [
                (40.6900, -74.0300),
                (40.6900, -73.9700),
                (40.7400, -73.9700),
                (40.7400, -74.0300),
                (40.6900, -74.0300)
            ]
        ]
    ) AS in_service_zone
FROM delivery_orders;
```

## Geo Functions Reference

```sql
-- greatCircleDistance: distance between two lon/lat pairs (meters)
SELECT greatCircleDistance(-73.9857, 40.7484, -0.1276, 51.5074);

-- pointInPolygon: check if point is inside polygon
SELECT pointInPolygon((10.0, 10.0), [[(0,0),(20,0),(20,20),(0,20),(0,0)]]);

-- greatCircleAngle: angle in degrees between two points
SELECT greatCircleAngle(-73.9857, 40.7484, -0.1276, 51.5074);

-- readWKTPoint / readWKTRing / readWKTPolygon / readWKTMultiPolygon:
-- Parse Well-Known Text (WKT) strings into geo types
SELECT readWKTPoint('POINT(-73.9857 40.7484)');
```

## Practical Example: Store Locator

```sql
CREATE TABLE stores (
    store_id UInt64,
    store_name String,
    location Point,
    service_area Polygon
) ENGINE = MergeTree()
ORDER BY store_id;

-- Find nearest stores to a customer location
SELECT
    store_name,
    round(greatCircleDistance(
        location.2, location.1,
        -73.9857, 40.7484  -- customer at Times Square
    ) / 1000, 2) AS distance_km,
    pointInPolygon(
        (40.7484, -73.9857),
        service_area
    ) AS can_deliver
FROM stores
ORDER BY distance_km
LIMIT 10;
```

## Summary

ClickHouse's geo data types - Point, Ring, Polygon, and MultiPolygon - provide a native way to store and query geographic data without external extensions. Using `greatCircleDistance` for proximity calculations and `pointInPolygon` for geo-fencing, you can build powerful location-aware analytics directly in SQL. These types are represented as tuples and arrays, making them familiar to work with and efficient for large-scale geo queries.
