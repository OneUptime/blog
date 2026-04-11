# Validation Summary: How to Use ST_Distance_Sphere() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL Spatial Functions (ST_Distance_Sphere, ST_GeomFromText, ST_Distance)
- SRID 4326 (WGS 84) geographic coordinate system
- GIS / spatial indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Convenience Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Spatial Relation Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Reference Manual: Spatial Reference Systems — https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- EPSG:4326 axis order specification (latitude, longitude)
- Boost.Geometry documentation (MySQL's underlying spatial library)

## Issues Found
- **Vincenty algorithm claim in comparison table**: The post stated that `ST_Distance()` with SRID 4326 uses the "Vincenty" algorithm. MySQL 8.0 uses Boost.Geometry internally, which implements the Andoyer-Lambert-Thomas method for geodesic calculations, not Vincenty's inverse formula. The MySQL documentation itself describes this as computing "geodesic distance" without naming a specific algorithm. Changed "Ellipsoidal (Vincenty)" to "Ellipsoidal (geodesic)" in the comparison table.

## Review Notes
- The POINT coordinate order (`POINT(lat lon)` with SRID 4326) is correct for MySQL 8.0, which follows the EPSG-defined axis order (latitude first, longitude second). This is a common source of confusion since many other systems use longitude-first ordering.
- The use of `HAVING` without `GROUP BY` to reference a column alias is valid MySQL-specific behavior, though it might confuse readers familiar with standard SQL. This is not an error.
- The default radius of 6,370,986 meters is confirmed per the MySQL 8.0 documentation.
- The 0.3% accuracy difference claim for distances under 1,000 km is a reasonable approximation given Earth's oblateness (~0.3%).
