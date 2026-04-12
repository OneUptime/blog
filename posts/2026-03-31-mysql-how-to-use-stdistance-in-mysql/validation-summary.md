# Validation Summary: How to Use ST_Distance() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_Distance() function
- ST_Distance_Sphere() function
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexes and proximity queries
- INFORMATION_SCHEMA.ST_UNITS_OF_MEASURE

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Relation Functions That Use Object Shapes — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Reference Manual: Spatial Convenience Functions (ST_Distance_Sphere) — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Spatial Reference Systems — https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- MySQL 8.0 Reference Manual: ST_Buffer() Spatial Operator Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ST_UNITS_OF_MEASURE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-st-units-of-measure-table.html

## Issues Found

1. **Invalid unit name 'mile'**: The post listed `'mile'` as an available unit for the optional unit parameter. Plain `'mile'` is not a valid unit name in MySQL's `INFORMATION_SCHEMA.ST_UNITS_OF_MEASURE` table. Changed to `'Statute mile'` and added a note about querying the full list of available units.

2. **Missing version note for ST_Buffer() with geographic SRS**: The proximity query optimization example using `ST_Buffer()` with SRID 4326 did not mention that this requires MySQL 8.0.26+ and only supports Point geometries. Added a version/limitation note.

3. **ST_Distance_Sphere() incorrectly labeled as "Legacy"**: The section heading called ST_Distance_Sphere() a "Legacy Function" and the text implied it was only used before MySQL 8.0. In reality, ST_Distance_Sphere() is not deprecated and remains fully supported in MySQL 8.0+. It uses a spherical model (vs. ellipsoidal for ST_Distance with SRID 4326). Reworded the heading and description to accurately characterize it as a spherical alternative.

## Review Notes
- The coordinate order throughout the post is correct: SRID 4326 in MySQL 8.0 uses latitude/longitude order in WKT (e.g., `POINT(40.7128 -74.0060)` = lat 40.7128, lon -74.0060 for NYC), while ST_Distance_Sphere() uses the standard WKT X/Y order where X=longitude, Y=latitude.
- The Cartesian distance examples (POINT, LINESTRING, POLYGON) are mathematically correct.
- The approximate NYC-to-London distance of 5,570,000 meters is reasonable for the ellipsoidal model.
- The post's description that SRID 4326 returns results "in the units of the spatial reference system (e.g., meters)" is slightly imprecise — the SRS unit for 4326 is degrees, but MySQL returns geodesic distance in meters for geographic SRS. This is practically correct and clear enough for the target audience.
