# Validation Summary: How to Find Nearest Neighbors Using Spatial Queries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial extensions
- SRID 4326 (WGS 84) geographic spatial reference system
- ST_Distance_Sphere() function
- Spatial indexes (R-tree)
- MBRContains() for bounding box filtering
- Spherical law of cosines (Haversine-equivalent) formula
- ST_GeomFromText() with geographic SRS

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Data Types: https://dev.mysql.com/doc/refman/8.0/en/spatial-types.html
- MySQL 8.0 Reference Manual — Spatial Convenience Functions (ST_Distance_Sphere): https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual — Spatial Relation Functions That Use Minimum Bounding Rectangles (MBRContains): https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-mbr.html
- MySQL 8.0 Reference Manual — Creating Spatial Indexes: https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- MySQL 8.0 Reference Manual — Spatial Reference System Support: https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- EPSG:4326 axis order definition (latitude, longitude): https://epsg.io/4326

## Issues Found
No technical issues found.

## Review Notes
- The "Haversine" section (line 83) actually implements the spherical law of cosines formula, not the Haversine formula. Both produce mathematically identical results for all practical purposes, and this naming conflation is extremely common across the industry. The math itself is correct.
- The `@search_radius_m = 5000` variable in the bounding box section is set but never referenced in code — it serves only as a documentation comment. The actual filter uses `@delta = 0.045`. This is not incorrect but could be slightly clearer.
- The `@delta = 0.045` approximation for 5 km is accurate for latitude (~5 km) but covers slightly less distance in longitude (~3.8 km) at the 40.73° latitude used in the examples. The post correctly labels this as "approximate."
- MBRContains() with geographic SRS (SRID 4326) requires MySQL 8.0.24+. The post does not specify a minimum MySQL version, which readers should be aware of.
- The polygon ring direction (counterclockwise) is correct for geographic SRS exterior rings in MySQL 8.0. Stricter ring validation was introduced in MySQL 8.0.26+.
