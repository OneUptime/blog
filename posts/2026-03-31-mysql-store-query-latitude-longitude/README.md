# How to Store and Query Latitude/Longitude in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Geolocation, Spatial Query, Database, GIS

Description: Learn the best ways to store and query latitude and longitude coordinates in MySQL using POINT columns or DECIMAL columns.

---

## Storage Options for Lat/Lng in MySQL

MySQL gives you two main ways to store geographic coordinates:

1. **DECIMAL columns** - Simple, compatible, easy to understand
2. **POINT geometry column** - Native spatial type, enables spatial indexes and spatial functions

## Option 1: Using DECIMAL Columns

This is the traditional approach and works everywhere:

```sql
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL
);

INSERT INTO locations (name, latitude, longitude) VALUES
  ('Eiffel Tower', 48.8584, 2.2945),
  ('Statue of Liberty', 40.6892, -74.0445),
  ('Big Ben', 51.5007, -0.1246);
```

Use `DECIMAL(10, 7)` to store 7 decimal places, which gives centimeter-level precision.

## Option 2: Using POINT with SRID 4326

This enables native spatial functions and spatial indexes:

```sql
CREATE TABLE locations_geo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  coords POINT NOT NULL SRID 4326,
  SPATIAL INDEX (coords)
);

INSERT INTO locations_geo (name, coords) VALUES
  ('Eiffel Tower',        ST_GeomFromText('POINT(48.8584 2.2945)', 4326)),
  ('Statue of Liberty',   ST_GeomFromText('POINT(40.6892 -74.0445)', 4326)),
  ('Big Ben',             ST_GeomFromText('POINT(51.5007 -0.1246)', 4326));
```

Note: for SRID 4326 (WGS 84), the convention is `POINT(latitude longitude)`.

## Retrieving Coordinates

For DECIMAL columns:

```sql
SELECT name, latitude, longitude FROM locations;
```

For POINT columns, extract lat/lng with `ST_X()` and `ST_Y()`:

```sql
SELECT
  name,
  ST_X(coords) AS latitude,
  ST_Y(coords) AS longitude
FROM locations_geo;
```

## Calculating Distance Between Two Points

With DECIMAL columns, use the Haversine formula:

```sql
SET @lat1 = 48.8584;
SET @lng1 = 2.2945;
SET @lat2 = 51.5007;
SET @lng2 = -0.1246;

SELECT (
  6371 * ACOS(
    COS(RADIANS(@lat1)) * COS(RADIANS(@lat2)) *
    COS(RADIANS(@lng2) - RADIANS(@lng1)) +
    SIN(RADIANS(@lat1)) * SIN(RADIANS(@lat2))
  )
) AS distance_km;
```

With POINT columns, use `ST_Distance_Sphere()`:

```sql
SET @point1 = ST_GeomFromText('POINT(48.8584 2.2945)', 4326);
SET @point2 = ST_GeomFromText('POINT(51.5007 -0.1246)', 4326);

SELECT ST_Distance_Sphere(@point1, @point2) / 1000 AS distance_km;
```

## Finding Nearby Records

With POINT columns and spatial index:

```sql
SET @center = ST_GeomFromText('POINT(48.8584 2.2945)', 4326);

SELECT
  name,
  ROUND(ST_Distance_Sphere(coords, @center) / 1000, 2) AS distance_km
FROM locations_geo
WHERE ST_Distance_Sphere(coords, @center) <= 500000
ORDER BY distance_km
LIMIT 10;
```

## Inserting from Application Code

In Python:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='pass', database='geo_db')
cursor = conn.cursor()

lat, lng = 48.8584, 2.2945
cursor.execute(
    "INSERT INTO locations_geo (name, coords) VALUES (%s, ST_GeomFromText(%s, 4326))",
    ('Eiffel Tower', f'POINT({lat} {lng})')
)
conn.commit()
```

## Which Approach Should You Use?

| Feature | DECIMAL Columns | POINT Column |
|---|---|---|
| Simplicity | High | Medium |
| Spatial index support | No | Yes |
| Built-in distance functions | No | Yes |
| Compatibility | Universal | MySQL 8.0+ |

Use `POINT` with SRID 4326 for new projects. Use `DECIMAL` when you need maximum compatibility or are working with a legacy schema.

## Summary

MySQL supports geographic coordinates via `DECIMAL` columns or native `POINT` geometry with SRID 4326. The `POINT` approach enables spatial indexes and `ST_Distance_Sphere()` for accurate distance calculations. Use `DECIMAL(10, 7)` for lat/lng precision of about 1 cm, and always use SRID 4326 for WGS 84 coordinates.
