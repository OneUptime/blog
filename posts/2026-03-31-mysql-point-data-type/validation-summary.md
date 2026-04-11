# Validation Summary: How to Use POINT Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 spatial data types (POINT)
- MySQL spatial functions (ST_GeomFromText, ST_X, ST_Y, ST_Distance_Sphere, ST_AsText, MBRContains)
- WGS84 / SRID 4326 geographic coordinate system
- Spatial indexes in MySQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Data Types: https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual — WKT Functions (ST_GeomFromText): https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual — Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual — Spatial Convenience Functions (ST_Distance_Sphere): https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual — MySQL-Specific Spatial Functions (Point constructor): https://dev.mysql.com/doc/refman/8.0/en/gis-mysql-specific-functions.html
- EPSG Registry — SRID 4326 (WGS 84) axis order definition

## Issues Found

1. **Axis order wrong for SRID 4326 (critical)**: The entire post used `POINT(longitude latitude)` format in all WKT strings. In MySQL 8.0, SRID 4326 defines the axis order as latitude first, longitude second (per the SRS definition `AXIS["Lat",NORTH],AXIS["Long",EAST]`). All `ST_GeomFromText` calls and the bounding box polygon were corrected to use `POINT(latitude longitude)`. Without this fix, the Sydney Opera House insert (`POINT(151.2153 -33.8568)`) would fail with a latitude out-of-range error since 151.2153 exceeds the valid latitude range of [-90, 90].

2. **ST_X/ST_Y descriptions inverted**: The post claimed `ST_X()` returns longitude and `ST_Y()` returns latitude. For SRID 4326, `ST_X()` returns the first axis (latitude) and `ST_Y()` returns the second axis (longitude). Fixed all descriptions, column aliases, and output tables throughout the post.

3. **ST_MakePoint does not exist in MySQL**: `ST_MakePoint()` is a PostGIS (PostgreSQL) function. MySQL does not have this function. Replaced with `ST_SRID(Point(lat, lon), 4326)` which uses MySQL's `Point()` constructor with `ST_SRID()` to assign the correct SRID. Also fixed the introductory text and syntax section references.

4. **ST_Distance_Sphere described as using WGS84 ellipsoid**: The code comment incorrectly stated "Distance in meters using the WGS84 ellipsoid." `ST_Distance_Sphere` uses a spherical Earth model, not the WGS84 ellipsoid. Changed to "Distance in meters using a spherical Earth model." The ellipsoid-based function is `ST_Distance()` (not `_Sphere`). Also updated Best Practices to clarify the distinction.

## Review Notes
- The post targets MySQL 8.0+ features (SRID column constraints, geographic SRS support). These features are not available in MySQL 5.7 or earlier.
- `ST_Latitude()` and `ST_Longitude()` (available since MySQL 8.0.12) were mentioned in Best Practices and Summary as clearer alternatives to `ST_X()`/`ST_Y()` for geographic SRS, since the axis-order semantics of ST_X/ST_Y can be confusing.
- `MBRContains` with geographic SRS is supported as of MySQL 8.0.32. Earlier 8.0 versions may require `ST_Contains` or `ST_Within` instead.
- The distance values in the output table are approximate and may vary slightly depending on the exact sphere radius used by the MySQL version.
