# Validation Summary: How to Use ST_GeomFromText() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 spatial functions
- ST_GeomFromText() / ST_GeometryFromText()
- Well-Known Text (WKT) format
- SRID 4326 (WGS 84) geographic coordinate system
- MySQL spatial indexing

## Sources Consulted
- [MySQL 8.0 Reference Manual: Functions That Create Geometry Values from WKT Values](https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html)
- [MySQL 8.0 Reference Manual: Point Property Functions (ST_Latitude, ST_Longitude)](https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html)
- [MySQL Blog: Axis Order in Spatial Reference Systems](https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/)
- [MySQL 8.0 Reference Manual: Spatial Reference System Support](https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html)

## Issues Found

### 1. SRID 4326 axis order was reversed throughout the post (Major)
**What was wrong:** The post stated "The order is `POINT(x y)` where x=longitude and y=latitude for SRID 4326" and used `POINT(longitude latitude)` format in all SRID 4326 examples (e.g., `POINT(-73.9857 40.7484)` for NYC).

**What was changed:** In MySQL 8.0.12+, SRID 4326 follows the EPSG-defined axis order of (latitude, longitude). The MySQL docs confirm this via `ST_Latitude()` / `ST_Longitude()` — the first coordinate is latitude, the second is longitude. All SRID 4326 examples were corrected to use `POINT(latitude longitude)` format (e.g., `POINT(40.7484 -73.9857)` for NYC). The explanation was updated to clearly state the correct axis order.

**Why:** Using the wrong axis order would silently produce geometries at incorrect locations. For example, `POINT(-73.9857 40.7484)` with SRID 4326 would place the point at latitude -73.9857, longitude 40.7484 — somewhere in the Southern Ocean, not New York City.

**Affected sections:** POINT example, INSERT statements, ST_AsText output, ST_Distance_Sphere query, ST_Within polygon query.

### 2. Error message referenced wrong function name (Minor)
**What was wrong:** The error example showed `st_geometryfromtext` in the error message, but the function being called was `ST_GeomFromText()`.

**What was changed:** Updated to `st_geomfromtext` and added the SQLSTATE code `(22023)` to match actual MySQL 8.0 error output.

## Review Notes
- The `MULTIPOINT(0 0, 5 5, 10 10)` syntax (without inner parentheses for each point) is accepted by MySQL but is non-standard per the OGC WKT specification. The standard form is `MULTIPOINT((0 0), (5 5), (10 10))`. Both work in MySQL, so this was left as-is.
- The post mentions `GeomFromText()` as a deprecated alias, which is correct — it was removed in MySQL 8.0.
- The `options` parameter (third argument) for axis-order override could be mentioned as a way to use longitude-latitude order if preferred (`axis-order=long-lat`), but this is optional and the post correctly focuses on the default behavior.
