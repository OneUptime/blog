# Validation Summary: How to Use ST_SRID() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_SRID() function (one-argument and two-argument forms)
- ST_GeomFromText() WKT parsing
- ST_Transform() coordinate reprojection
- ST_AsText() geometry output
- INFORMATION_SCHEMA.ST_GEOMETRY_COLUMNS view
- SRID column constraints and spatial indexes
- WGS 84 (SRID 4326) coordinate system

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Geohash Functions and General Geometry Property Functions — https://dev.mysql.com/doc/refman/8.0/en/gis-general-property-functions.html
- MySQL 8.0 Reference Manual: Spatial Reference System Functions (ST_Transform) — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Functions That Create Geometry Values from WKT — https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ST_GEOMETRY_COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-st-geometry-columns-table.html
- MySQL 8.0 Reference Manual: Spatial Reference Systems — https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html

## Issues Found
No technical issues found.

## Review Notes
- The blog post correctly uses (latitude, longitude) coordinate order for SRID 4326 (e.g., `POINT(40.7128 -74.0060)` for New York City). In MySQL 8.0+, SRID 4326 uses axis order as defined by WGS 84: latitude first, longitude second. This is correct but counterintuitive for readers coming from traditional GIS tools where POINT(X Y) typically means (longitude, latitude). A future improvement could add a brief note about this axis-order subtlety to help readers avoid confusion.
- All SQL syntax is valid and uses current, non-deprecated MySQL 8.0+ functions.
- The distinction between ST_SRID() (relabeling) and ST_Transform() (reprojection) is clearly and accurately explained.
- The INFORMATION_SCHEMA.ST_GEOMETRY_COLUMNS query correctly references the SRS_ID and GEOMETRY_TYPE_NAME columns, both of which are confirmed in the MySQL docs.
- The SRID column constraint syntax (`POINT NOT NULL SRID 4326`) is valid DDL in MySQL 8.0+.
