# Validation Summary: How to Create a Spatial Index in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (spatial features)
- SQL (DDL, DML, spatial queries)
- Spatial Indexes (R-tree)
- GIS / Geometry types (POINT, POLYGON)
- SRID 4326 (WGS 84 geographic coordinate system)
- Spatial functions: ST_GeomFromText, ST_Distance_Sphere, MBRContains, ST_Latitude, ST_Longitude, ST_Buffer, ST_Envelope, ST_Within

## Sources Consulted
- MySQL 8.0 Reference Manual — Creating Spatial Indexes: https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- MySQL 8.0 Reference Manual — Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual — WKT Functions (ST_GeomFromText axis-order option): https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual — Spatial Reference Systems: https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- MySQL 8.0 Reference Manual — MBR Spatial Relation Functions: https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-mbr.html
- MySQL 8.0 Reference Manual — Spatial Convenience Functions (ST_Distance_Sphere): https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL Blog — Axis Order in Spatial Reference Systems: https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/

## Issues Found

### 1. Wrong coordinate order in all POINT WKT values (critical)
**What was wrong:** All `ST_GeomFromText('POINT(...)', 4326)` calls used longitude-first, latitude-second order (e.g., `POINT(-74.006 40.7128)`). In MySQL 8.0.12+, the default `axis-order` for SRID 4326 is `srid-defined`, which follows the WGS 84 SRS definition: latitude first, longitude second. The original code would place points at completely wrong geographic locations (e.g., latitude -74 near Antarctica instead of New York).

**What was changed:** Reversed all POINT coordinates to latitude-first order (e.g., `POINT(40.7128 -74.006)`). Updated the INSERT comment from "(longitude, latitude)" to "(latitude, longitude)".

### 2. Wrong coordinate order in all POLYGON WKT values (critical)
**What was wrong:** POLYGON coordinates used longitude-first order (e.g., `POLYGON((-74.1 40.6, ...))`). Same axis-order issue as POINT values — the bounding box polygons would not enclose the intended geographic area.

**What was changed:** Reversed all POLYGON coordinates to latitude-first order (e.g., `POLYGON((40.6 -74.1, ...))`).

### 3. ST_X/ST_Y used incorrectly for SRID 4326 (significant)
**What was wrong:** The blog used `ST_X(location) AS longitude` and `ST_Y(location) AS latitude`. In MySQL 8.0.12+, for SRID 4326, `ST_X()` returns the first SRS axis (latitude), and `ST_Y()` returns the second (longitude). The aliases were reversed.

**What was changed:** Replaced `ST_X()`/`ST_Y()` with `ST_Latitude()`/`ST_Longitude()` (available since MySQL 8.0.12), which are unambiguous and recommended for geographic POINT data. Updated column order in all SELECT queries and output tables to show latitude before longitude.

### 4. Best practices section gave wrong axis-order advice (significant)
**What was wrong:** The best practices stated "Use `ST_GeomFromText('POINT(lon lat)', 4326)` - note longitude first, latitude second" and "Use `ST_X()` to get longitude and `ST_Y()` to get latitude." Both are incorrect for MySQL 8.0 with SRID 4326.

**What was changed:** Updated to explain that MySQL 8.0 with SRID 4326 uses latitude-first axis order, and to recommend `ST_Latitude()`/`ST_Longitude()` over `ST_X()`/`ST_Y()`.

### 5. Inaccurate example output for Midtown Store distance (minor)
**What was wrong:** The distance between Midtown Store (lat 40.758, lon -73.985) and the Times Square reference point (lat 40.758, lon -73.9855) was shown as 0 meters. The actual spherical distance is approximately 42 meters (0.0005 degrees of longitude at latitude ~40.76).

**What was changed:** Updated the output from 0 to 42 meters.

## Review Notes
- The `ST_Buffer` / `ST_Envelope` pattern for creating bounding boxes around a reference point uses a degree-based radius (`@radius_degrees = 0.5`). Before MySQL 8.0.26, `ST_Buffer` handles geographic geometries as Cartesian, so this works but is an approximation. From MySQL 8.0.26+, `ST_Buffer` performs geodesic buffering. The degree-based approach still works but could be noted as version-sensitive.
- The post correctly notes that `ST_Distance_Sphere` does not use the spatial index and recommends combining it with `MBRContains` for indexed queries — this is an important and accurate optimization pattern.
- The post targets MySQL 8.0 features (SRID column constraints, spatial functions) but mentions MySQL 5.7.5+ for InnoDB spatial index support. This is accurate historical context.
