# Validation Summary: How to Use GEOMETRY Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types (GEOMETRY, POINT, LINESTRING, POLYGON)
- MySQL spatial functions (ST_GeomFromText, ST_AsText, ST_GeometryType, ST_X, ST_Y, ST_Distance_Sphere, ST_Within, ST_Area, MBRIntersects)
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexes in MySQL
- Well-Known Text (WKT) format

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: Creating Spatial Columns — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-columns.html
- MySQL 8.0 Reference Manual: Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude) — https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual: Geometry Format Conversion Functions (ST_GeomFromText) — https://dev.mysql.com/doc/refman/8.0/en/gis-format-conversion-functions.html
- MySQL 8.0 Reference Manual: Polygon Property Functions (ST_Area) — https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html
- MySQL Blog: Axis Order in Spatial Reference Systems — https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL Blog: Geographic Spatial Reference Systems in MySQL 8.0 — https://dev.mysql.com/blog-archive/geographic-spatial-reference-systems-in-mysql-8-0/

## Issues Found

### 1. Coordinate order incorrect for SRID 4326 (all WKT strings)
**What was wrong:** All POINT, LINESTRING, and POLYGON WKT values used (longitude, latitude) order — e.g., `POINT(2.2945 48.8584)` for the Eiffel Tower. In MySQL 8.0.12+, SRID 4326 (WGS 84) defines the axis order as (latitude, longitude). By default, `ST_GeomFromText` follows the SRS-defined axis order, so the first value is interpreted as latitude.

**What was changed:** Swapped all coordinate pairs to (latitude, longitude) order — e.g., `POINT(48.8584 2.2945)`. This applies to the Eiffel Tower POINT, the LINESTRING road, the POLYGON park boundary, the proximity search POINT, and the bounding box POLYGON.

**Why:** Without this fix, the Eiffel Tower would be stored at approximately lat 2.29°N, lon 48.86°E (somewhere near the Horn of Africa), not in Paris. MySQL 8.0.12+ changed to follow the SRS axis order by default, and SRID 4326 defines latitude as the first axis.

### 2. ST_X/ST_Y aliases swapped
**What was wrong:** The query `SELECT name, ST_X(geom) AS longitude, ST_Y(geom) AS latitude` had the aliases reversed. For SRID 4326 in MySQL 8.0.12+, `ST_X()` returns the first SRS axis (latitude) and `ST_Y()` returns the second (longitude).

**What was changed:** Swapped to `ST_X(geom) AS latitude, ST_Y(geom) AS longitude`.

**Why:** As of MySQL 8.0.12, `ST_X()` refers to the first axis of the SRS definition. For SRID 4326, the first axis is latitude.

### 3. ST_Area return unit description incorrect
**What was wrong:** The comment said "(returns value in coordinate units)". For geographic SRS like SRID 4326 in MySQL 8.0.13+, `ST_Area()` computes the geodesic area and returns the result in square meters, not coordinate units (square degrees).

**What was changed:** Updated comment to "(returns area in square meters for geographic SRS)".

**Why:** MySQL 8.0.13 added geodesic area computation for geographic SRS. The result for SRID 4326 is in square meters.

## Review Notes
- The post targets MySQL 8.0+ features (SRID in column definition, spatial index on SRID-constrained columns). All syntax is valid for MySQL 8.0.12+.
- The `ST_Distance_Sphere` function in the proximity search is used in the WHERE clause alongside a geometry type filter. If the optimizer evaluates `ST_Distance_Sphere` on non-POINT rows before the type filter, it could raise an error since `ST_Distance_Sphere` only accepts POINT or MULTIPOINT arguments. In practice, MySQL's optimizer typically handles this correctly, but a subquery or CTE could make the intent more explicit.
- MySQL 8.0.12 also introduced `ST_Latitude()` and `ST_Longitude()` as semantic alternatives to `ST_X()`/`ST_Y()` for geographic SRS. These are clearer but `ST_X`/`ST_Y` with correct aliases work fine.
- The `ST_Area()` function raises `ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS` in MySQL 8.0.0–8.0.12; geodesic area support was added in 8.0.13.
