# How to Use MySQL for Geospatial Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Geospatial, Spatial Index, GIS, Location

Description: Learn how to store and query geospatial data in MySQL using POINT columns, spatial indexes, and ST_ functions for proximity searches and boundary queries.

---

MySQL has supported geospatial data types and functions since version 5.7, with significant improvements in MySQL 8.0. Using native spatial types and spatial indexes, you can perform proximity searches, containment checks, and distance calculations directly in SQL without a separate GIS layer.

## Setting Up a Locations Table

Use the `POINT` data type with SRID 4326 (WGS 84 - the coordinate system used by GPS and most mapping APIs):

```sql
CREATE TABLE locations (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(100),
  coordinates POINT NOT NULL SRID 4326,
  SPATIAL INDEX idx_coordinates (coordinates)
) ENGINE=InnoDB;
```

The `SRID 4326` annotation tells MySQL that coordinates are in degrees of latitude/longitude and enables geographic distance calculations.

## Inserting Geospatial Data

Use `ST_GeomFromText` or `ST_SRID` with `POINT()`:

```sql
INSERT INTO locations (name, category, coordinates) VALUES
  ('Central Park',   'park',       ST_SRID(POINT(-73.9654, 40.7829), 4326)),
  ('Times Square',   'landmark',   ST_SRID(POINT(-73.9857, 40.7580), 4326)),
  ('Grand Central',  'transit',    ST_SRID(POINT(-73.9772, 40.7527), 4326));
```

Note: for SRID 4326, MySQL uses `POINT(longitude, latitude)` order following the GeoJSON convention.

## Finding Nearby Locations

Use `ST_Distance_Sphere` for great-circle distance in meters:

```sql
SET @lat := 40.7580;
SET @lng := -73.9857;
SET @radius_meters := 1000;

SELECT
  id,
  name,
  category,
  ST_Distance_Sphere(
    coordinates,
    ST_SRID(POINT(@lng, @lat), 4326)
  ) AS distance_meters
FROM locations
WHERE ST_Distance_Sphere(
    coordinates,
    ST_SRID(POINT(@lng, @lat), 4326)
  ) <= @radius_meters
ORDER BY distance_meters;
```

## Using MBRContains for Bounding Box Queries

For viewport-based map queries, bounding box lookups with the spatial index are faster than distance calculations:

```sql
-- Find all locations within a bounding box
SET @min_lng := -74.02;
SET @min_lat := 40.70;
SET @max_lng := -73.93;
SET @max_lat := 40.82;

SELECT id, name
FROM locations
WHERE MBRContains(
  ST_GeomFromText(CONCAT(
    'POLYGON((',
    @min_lat, ' ', @min_lng, ',',
    @min_lat, ' ', @max_lng, ',',
    @max_lat, ' ', @max_lng, ',',
    @max_lat, ' ', @min_lng, ',',
    @min_lat, ' ', @min_lng,
    '))'
  ), 4326),
  coordinates
);
```

Note: `ST_GeomFromText` with SRID 4326 uses `(latitude longitude)` axis order per the EPSG standard, unlike the `POINT()` constructor which uses `(longitude, latitude)`.

`MBRContains` uses the spatial index and is more efficient than `ST_Contains` for rough viewport filtering.

## Storing Polygons for Geofencing

Store service areas or delivery zones as `POLYGON`:

```sql
CREATE TABLE service_zones (
  id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(200),
  boundary POLYGON NOT NULL SRID 4326,
  SPATIAL INDEX idx_boundary (boundary)
);

-- Check if a point is inside a service zone
SELECT name FROM service_zones
WHERE ST_Contains(
  boundary,
  ST_SRID(POINT(-73.9857, 40.7580), 4326)
);
```

## Summary

MySQL geospatial support covers proximity searches with `ST_Distance_Sphere`, bounding box queries with `MBRContains`, and polygon containment with `ST_Contains`. The spatial index on a `POINT SRID 4326` column enables efficient lookups for map-based applications. For complex GIS analysis or global-scale routing, a dedicated PostGIS or BigQuery Geo extension is more capable, but MySQL handles store-locator and delivery-zone use cases well.
