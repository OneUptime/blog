# Validation Summary: How to Use ST_Intersection() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ Spatial Functions
- GIS (Geographic Information System) support in MySQL
- WKT (Well-Known Text) geometry format

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Analysis Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-analysis-functions.html
- MySQL 8.0 Reference Manual: ST_Intersection() — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html#function_st-intersection
- MySQL 8.0 Reference Manual: ST_IsEmpty() — https://dev.mysql.com/doc/refman/8.0/en/gis-general-property-functions.html#function_st-isempty
- MySQL 8.0 Reference Manual: Creating Spatial Indexes — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- OGC Simple Features Specification (WKT format reference)

## Issues Found
No technical issues found.

## Review Notes
- The post does not specify a minimum MySQL version. `ST_Intersection()` and related spatial functions were significantly improved in MySQL 8.0 with the switch to Boost.Geometry. Readers on MySQL 5.7 may encounter different behavior, particularly with `ST_IsEmpty()` which was a placeholder returning 0 in older versions.
- The exact vertex ordering in `ST_AsText()` output for the intersection polygon may vary slightly between MySQL minor versions, but the geometry itself is correct.
- The post correctly recommends using `ST_Intersects()` as a pre-filter before `ST_Intersection()` for performance, which is an important best practice.
- SRID handling is not discussed. In MySQL 8.0+, all examples default to SRID 0 (Cartesian plane), which is fine for the tutorial context. Real-world geographic applications would typically use SRID 4326 (WGS 84).
