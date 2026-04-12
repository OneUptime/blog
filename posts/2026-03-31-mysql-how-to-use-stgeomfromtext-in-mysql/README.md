# How to Use ST_GeomFromText() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, ST_GeomFromText, GIS

Description: Learn how to use MySQL's ST_GeomFromText() function to convert Well-Known Text (WKT) strings into geometry values for spatial data operations.

---

## What Is ST_GeomFromText()

`ST_GeomFromText()` converts a Well-Known Text (WKT) string into a MySQL geometry value. WKT is a standard text representation for spatial objects defined by the OGC.

This function is the primary way to insert or construct spatial values from human-readable descriptions.

## Syntax

```sql
ST_GeomFromText(wkt_string [, srid])
ST_GeomFromText(wkt_string [, srid [, options]])
```

- `wkt_string` - the WKT representation of the geometry
- `srid` - optional Spatial Reference ID (0 if omitted; use 4326 for GPS coordinates)

Aliases: `ST_GeometryFromText()`, `GeomFromText()` (deprecated)

## WKT Geometry Types

### POINT

```sql
SELECT ST_GeomFromText('POINT(10.5 20.3)') AS pt;
SELECT ST_GeomFromText('POINT(40.7484 -73.9857)', 4326) AS nyc_point;
```

For SRID 4326 in MySQL 8.0, the axis order follows the SRS definition: `POINT(latitude longitude)`.

### LINESTRING

```sql
SELECT ST_GeomFromText('LINESTRING(0 0, 10 10, 20 5)') AS line;
```

### POLYGON

```sql
-- A simple square polygon (first and last points must match)
SELECT ST_GeomFromText('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))') AS box;

-- Polygon with a hole
SELECT ST_GeomFromText('POLYGON((0 0, 20 0, 20 20, 0 20, 0 0), (5 5, 15 5, 15 15, 5 15, 5 5))') AS box_with_hole;
```

### MULTIPOINT

```sql
SELECT ST_GeomFromText('MULTIPOINT(0 0, 5 5, 10 10)') AS mpt;
```

### GEOMETRYCOLLECTION

```sql
SELECT ST_GeomFromText('GEOMETRYCOLLECTION(POINT(0 0), LINESTRING(0 0, 10 10))') AS gc;
```

## Inserting Spatial Data Using ST_GeomFromText()

```sql
CREATE TABLE stores (
  id       INT     NOT NULL AUTO_INCREMENT,
  name     VARCHAR(200),
  location POINT   NOT NULL SRID 4326,
  PRIMARY KEY (id),
  SPATIAL INDEX idx_loc (location)
);

INSERT INTO stores (name, location) VALUES
  ('Downtown Store',    ST_GeomFromText('POINT(40.7484 -73.9857)', 4326)),
  ('Uptown Branch',     ST_GeomFromText('POINT(40.7823 -73.9654)', 4326)),
  ('Brooklyn Location', ST_GeomFromText('POINT(40.6501 -73.9442)', 4326));
```

## Converting Back with ST_AsText()

```sql
SELECT name, ST_AsText(location) AS wkt
FROM stores;
```

```text
+-------------------+----------------------------+
| name              | wkt                        |
+-------------------+----------------------------+
| Downtown Store    | POINT(40.7484 -73.9857)    |
| Uptown Branch     | POINT(40.7823 -73.9654)    |
| Brooklyn Location | POINT(40.6501 -73.9442)    |
+-------------------+----------------------------+
```

## Combining ST_GeomFromText() with Other Spatial Functions

Calculate distance from a reference point:

```sql
SELECT
  name,
  ST_Distance_Sphere(
    location,
    ST_GeomFromText('POINT(40.7484 -73.9857)', 4326)
  ) AS dist_meters
FROM stores
ORDER BY dist_meters;
```

Find stores within a polygon area:

```sql
SELECT name
FROM stores
WHERE ST_Within(
  location,
  ST_GeomFromText('POLYGON((40.70 -74.02, 40.70 -73.93, 40.78 -73.93, 40.78 -74.02, 40.70 -74.02))', 4326)
);
```

## Using SRID 0 (Cartesian Coordinates)

When no SRID is specified (or SRID 0), coordinates are treated as flat Cartesian:

```sql
SELECT ST_GeomFromText('POINT(3 4)') AS point_no_srid;
SELECT ST_Distance(
  ST_GeomFromText('POINT(0 0)'),
  ST_GeomFromText('POINT(3 4)')
) AS distance;  -- Returns 5 (Euclidean)
```

## Error Handling

If the WKT string is invalid:

```sql
SELECT ST_GeomFromText('POINT(invalid)');
-- ERROR 3037 (22023): Invalid GIS data provided to function st_geomfromtext.
```

Always validate WKT input before passing it to `ST_GeomFromText()`.

## Summary

`ST_GeomFromText()` is the standard function for constructing geometry values from WKT strings in MySQL. Use `SRID 4326` for GPS latitude/longitude data. Combine it with `ST_Distance_Sphere()`, `ST_Within()`, and other spatial functions to build geographic queries. Retrieve results in WKT format using `ST_AsText()` or as GeoJSON using `ST_AsGeoJSON()`.
