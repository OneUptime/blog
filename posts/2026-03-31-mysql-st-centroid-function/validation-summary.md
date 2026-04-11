# Validation Summary: How to Use ST_Centroid() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_Centroid()
- ST_AsText(), ST_X(), ST_Y()
- ST_GeomFromText()
- ST_Distance()
- MySQL spatial indexes

## Sources Consulted
- MySQL 8.4 Reference Manual — Polygon and MultiPolygon Property Functions: https://dev.mysql.com/doc/refman/8.4/en/gis-polygon-property-functions.html
- MySQL 8.0 Reference Manual — Polygon and MultiPolygon Property Functions: https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html
- MySQL 8.4 Reference Manual — Spatial Function Argument Handling: https://dev.mysql.com/doc/refman/8.4/en/spatial-function-argument-handling.html

## Issues Found
1. **Misleading SRID claim**: The post stated "The centroid is computed in Cartesian space regardless of SRID, so results are coordinate-unit based." This is misleading because in MySQL 8.0+, `ST_Centroid()` only supports Cartesian (projected) spatial reference systems. Passing a geometry with a geographic SRID (e.g., 4326 for WGS 84) raises an `ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS` error. Updated the sentence to clarify this limitation.

## Review Notes
- All SQL code examples are syntactically correct and produce the expected output.
- The centroid calculations for all polygons and multipolygons are mathematically correct.
- The practical example with the `districts` table is well-structured and uses correct `SRID 0` column definitions with spatial indexes.
- The official MySQL syntax is `ST_Centroid({poly|mpoly})`, accepting only Polygon and MultiPolygon types. The post's basic syntax shows `ST_Centroid(geometry)` which is slightly broader than the actual signature, but is acceptable for tutorial purposes since the examples all use the correct types.
- The description of multipolygon centroid computation as "area-weighted average of the centroids of the component polygons" is accurate.
