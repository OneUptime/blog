# Validation Summary: How to Use ST_Length() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Spatial Functions (ST_Length, ST_GeomFromText)
- WGS 84 / SRID 4326 geographic coordinate system
- GIS / Spatial geometry (LineString, MultiLineString)

## Sources Consulted
- MySQL 8.0 Reference Manual — LineString Property Functions: https://dev.mysql.com/doc/refman/8.0/en/gis-linestring-property-functions.html

## Issues Found
1. **Incorrect version for unit parameter**: The post stated the optional `unit` parameter was added in "MySQL 8.0.24+". According to the MySQL 8.0 documentation, it was added in **MySQL 8.0.16**. Fixed "8.0.24+" to "8.0.16+".

## Review Notes
- The Cartesian 3-4-5 example (sqrt(9+16) = 5) is correct.
- The geodetic example uses SRID 4326 with correct latitude/longitude axis order (lat first, lon second) matching MySQL 8.0's SRS-defined axis order. NYC (40.7128, -74.0060) to LA (34.0522, -118.2437) great-circle distance of ~3,940 km is accurate.
- The MultiLineString example correctly sums two segments of length 5 each for a total of 10.
- The NULL handling section is correct per MySQL 8.0 docs: ST_Length() returns NULL for non-LineString/MultiLineString geometries.
- The ST_Length vs ST_Distance comparison is accurate.
- The road network CREATE TABLE syntax with SRID constraint and SPATIAL INDEX is valid MySQL 8.0 syntax.
