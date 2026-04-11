# Validation Summary: What Is a MySQL Spatial Index

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial features
- R-tree spatial indexing
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial functions: ST_GeomFromText, ST_PointFromText, ST_Distance_Sphere, ST_Buffer, MBRContains
- InnoDB spatial indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Operator Functions (ST_Buffer) — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html
- MySQL 8.0 Reference Manual: Spatial Convenience Functions (ST_Distance_Sphere) — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Creating Spatial Indexes — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- MySQL 8.0 Reference Manual: Supported Spatial Data Formats — https://dev.mysql.com/doc/refman/8.0/en/gis-data-formats.html
- MySQL Blog: Axis Order in Spatial Reference Systems — https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL Blog: Geographic Spatial Reference Systems in MySQL 8.0 — https://dev.mysql.com/blog-archive/geographic-spatial-reference-systems-in-mysql-8-0/

## Issues Found
- **ST_Buffer distance unit incorrect**: The blog post used `@radius_deg = 0.05` with the comment "Approximate degrees for 5km" when calling `ST_Buffer()` on an SRID 4326 geometry. In MySQL 8.0.26+, `ST_Buffer()` with a geographic SRS interprets the distance parameter in meters, not degrees. The value 0.05 would produce a 5-centimeter buffer, not a 5 km buffer. Fixed to `@radius_m = 5000` with an updated comment noting the MySQL 8.0.26+ requirement. Prior to MySQL 8.0.26, `ST_Buffer()` does not support geographic SRS at all and would raise an error.

## Review Notes
- The POINT coordinate order `POINT(lat lon)` with SRID 4326 is correct for MySQL 8.0 (which follows the EPSG-defined axis order of latitude-first for WGS 84), but this is a common source of confusion since many other systems use lon/lat order. The post could benefit from a brief note about this in a future update.
- `ST_Distance_Sphere()` is correct and functional but uses a spherical model. For higher accuracy, `ST_Distance()` with SRID 4326 uses an ellipsoidal model. Both are valid approaches.
- The `ST_Buffer` + `MBRContains` optimization pattern requires MySQL 8.0.26+ for geographic SRS support. The post targets MySQL 8.0+ generally, so the version note added to the comment helps clarify this.
- MySQL auto-normalizes polygon ring orientation for geographic SRS, so the clockwise ring order used in the POLYGON examples is accepted and handled correctly.
