# Validation Summary: How to Use ST_Area() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Spatial Functions (ST_Area, ST_GeomFromText)
- WGS 84 / SRID 4326 geodetic coordinate system
- GIS polygon and multipolygon geometry types

## Sources Consulted
- MySQL 8.0 Reference Manual: Polygon and MultiPolygon Property Functions — https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html
- MySQL 8.0 Reference Manual: Spatial Function Reference — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual: Spatial Relation Functions (ST_Distance unit parameter) — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0.24 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-24.html
- MySQL 8.0 New Features list — https://dev.mysql.com/blog-archive/the-complete-list-of-new-features-in-mysql-8-0/

## Issues Found

### Issue 1: Incorrect unit parameter in ST_Area() syntax
- **What was wrong:** The post claimed the syntax was `ST_Area(geometry [, unit])` with an optional unit parameter added in MySQL 8.0.24+. This is false — ST_Area() accepts only a single geometry argument (`ST_Area({poly|mpoly})`). The unit parameter exists for ST_Distance() and ST_Length(), but not ST_Area().
- **What was changed:** Fixed the syntax section to show the correct signature. Rewrote the "Using Unit Parameter" section to "Converting Area Units" showing manual arithmetic conversion (dividing by 1,000,000 for square kilometres). Updated the Summary section to remove the claim about specifying units explicitly.

### Issue 2: Incorrect NULL behavior for non-polygon geometries
- **What was wrong:** The post claimed `ST_Area()` returns NULL for non-polygon geometries like points and linestrings. In MySQL 8.0.13+, passing a non-polygon geometry raises an `ER_UNEXPECTED_GEOMETRY_TYPE` error, not NULL. NULL is only returned for NULL input or empty geometries.
- **What was changed:** Corrected the "Null Handling" section (renamed to "Error and Null Handling") to accurately describe that an error is raised for non-polygon types, and that NULL is returned only for NULL or empty geometry inputs. Updated the code example comment to show the error message.

## Review Notes
- The SRID 4326 axis order note (latitude, longitude) is correct for MySQL 8.0's WKT interpretation.
- The practical example using NYC coordinates (40.7128, -74.0060) correctly follows the (latitude, longitude) axis order for SRID 4326.
- The Cartesian area examples (4x3 rectangle = 12, two 2x2 squares = 8) are mathematically correct.
- The CREATE TABLE syntax with `POLYGON NOT NULL SRID 4326` and `SPATIAL INDEX` is valid MySQL 8.0 syntax.
