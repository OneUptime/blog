# Validation Summary: How to Use LINESTRING Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (Spatial / GIS features)
- SQL (DDL, DML, spatial queries)
- WKT (Well-Known Text) geometry format
- SRID 4326 (WGS 84 geographic coordinate system)

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Data Types: https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual — Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL Blog — Axis Order in Spatial Reference Systems: https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL Blog — Geographic Spatial Reference Systems in MySQL 8.0: https://dev.mysql.com/blog-archive/geographic-spatial-reference-systems-in-mysql-8-0/
- MySQL 8.0 Reference Manual — ST_GeomFromText: https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual — ST_Length: https://dev.mysql.com/doc/refman/8.0/en/gis-linestring-property-functions.html

## Issues Found

### 1. Incorrect WKT coordinate axis order for SRID 4326 (Critical)
**What was wrong:** All WKT coordinates throughout the post used (longitude, latitude) order (e.g., `LINESTRING(-73.9730 40.7648, ...)`). In MySQL 8.0, SRID 4326 (WGS 84) defines the axis order as (latitude, longitude). The default `srid-defined` axis order means the first coordinate is latitude and the second is longitude. The original coordinates would not error (values happen to be in valid ranges) but would place geometries at completely wrong locations (near Antarctica instead of New York City).

**What was changed:** Swapped all coordinate pairs to (latitude, longitude) order in the INSERT statements, the polygon for the intersection query, and updated all sample output accordingly.

### 2. ST_Length output mislabeled as degrees (Major)
**What was wrong:** The "Query LINESTRING Properties" section used the alias `length_degrees` and showed output values like `0.112000`, `0.009500`, `0.006900`. In MySQL 8.0, `ST_Length()` on geometry with SRID 4326 returns the geodesic length in **meters**, not degrees. The shown values were Cartesian distances in coordinate units, not actual MySQL 8.0 output.

**What was changed:** Renamed the alias to `length_meters`, changed `ROUND(ST_Length(path), 6)` to `ROUND(ST_Length(path))`, and updated sample output values to approximate meter values (10875, 768, 578).

### 3. Incorrect ST_IsSimple result for Central Park Loop (Minor)
**What was wrong:** The output showed `is_simple = 0` for the Central Park Loop. Analysis of the geometry shows it forms a closed quadrilateral with no self-intersections (non-adjacent segments do not cross). A closed LINESTRING without self-intersections is simple per the OGC specification, so ST_IsSimple should return 1.

**What was changed:** Changed `is_simple` from `0` to `1` for Central Park Loop.

### 4. Best Practices advised wrong coordinate order (Major)
**What was wrong:** The Best Practices section stated "Store points in (longitude, latitude) order to follow the WKT convention (X before Y)." This is incorrect for MySQL 8.0 with SRID 4326, which uses the SRS-defined axis order of (latitude, longitude) by default.

**What was changed:** Updated the guidance to explain that SRID 4326 in MySQL 8.0 uses (latitude, longitude) order by default, and mentioned the `axis-order=long-lat` option for those who prefer (longitude, latitude) order.

### 5. Missing output for "Measure Approximate Length in Meters" section (Minor)
**What was wrong:** The section had a SQL query but no sample output, unlike every other query section in the post.

**What was changed:** Added a sample output table showing the routes sorted by length in meters.

### 6. ST_AsText output used wrong coordinate order (Minor)
**What was wrong:** All ST_AsText sample output showed coordinates in (longitude, latitude) order (e.g., `POINT(-73.973 40.7648)`). Since ST_AsText uses the SRS-defined axis order for SRID 4326, the output would show (latitude, longitude) order.

**What was changed:** Updated all ST_AsText output values to show (latitude, longitude) order (e.g., `POINT(40.7648 -73.973)`).

## Review Notes
- The post correctly explains core LINESTRING concepts, functions, and spatial indexing.
- The MULTILINESTRING example uses SRID 0 (Cartesian) which is correct and avoids axis order concerns.
- The approximate meter values in sample output (10875, 768, 578) are computed using flat-Earth approximation at the given latitudes. Actual MySQL geodesic calculations on the WGS 84 ellipsoid may differ slightly.
- The `axis-order` option in `ST_GeomFromText` was added in MySQL 8.0.13. The post doesn't specify a minimum MySQL version but targets MySQL 8.0 generally, which is appropriate since 8.0.13 has been available since October 2018.
