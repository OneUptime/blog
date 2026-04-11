# Validation Summary: How to Use MySQL Spatial Data Types and Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 spatial data types (POINT, LINESTRING, POLYGON, GEOMETRY)
- MySQL spatial functions (ST_Distance, ST_Contains, ST_Within, MBRContains, ST_GeomFromText, ST_Point, ST_X, ST_Y, ST_AsText)
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexes (R-tree)

## Sources Consulted
- MySQL 8.0 Reference Manual: Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude) - https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual: WKT Functions (ST_GeomFromText axis order) - https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0.13 Release Notes (axis order change for geographic SRS)
- MySQL 8.0.1 Release Notes (geodetic ST_Distance introduction)

## Issues Found

1. **Incorrect MySQL 5.7 geodetic claim**: The post stated "MySQL 5.7+ added a spatial reference system (SRS) and geodetic calculations." MySQL 5.7 introduced the `ST_` function prefix but performed only Cartesian (planar) calculations. Geodetic calculations using SRS were introduced in MySQL 8.0. Fixed to clarify the distinction.

2. **Wrong WKT coordinate order throughout (major)**: All WKT `POINT()` and `POLYGON()` values used longitude-first order (e.g., `POINT(-73.9654 40.7829)`). In MySQL 8.0.13+, the default axis order for SRID 4326 follows the SRS definition: latitude first, then longitude (e.g., `POINT(40.7829 -73.9654)`). The `ST_Latitude()` documentation confirms: `ST_GeomFromText('POINT(45 90)', 4326)` yields latitude=45, longitude=90. Swapped all coordinate pairs in INSERT statements, standalone examples, polygon definitions, and the proximity query CONCAT expression.

3. **Swapped ST_X/ST_Y labels**: The post labeled `ST_X(coords)` as "longitude" and `ST_Y(coords)` as "latitude". Per the MySQL 8.0.12+ docs, `ST_X()` returns the first SRS axis value (latitude for SRID 4326) and `ST_Y()` returns the second (longitude). Fixed the column aliases and the corresponding output table.

4. **Section heading "ST_MBRContains"**: MySQL has no `ST_MBRContains` function. The correct name is `MBRContains` (no `ST_` prefix). Fixed the heading.

5. **ST_Point missing SRID in proximity query**: The proximity query used `ST_Point(@lon, @lat)` which creates a point with SRID 0, causing an `ER_GIS_DIFFERENT_SRIDS` error when compared against SRID 4326 geometry columns. Fixed to `ST_Point(@lat, @lon, 4326)` with correct axis order.

6. **ST_Point standalone example missing SRID**: The `ST_Point(-73.9857, 40.7580)` example created a Cartesian point (SRID 0), inconsistent with the tutorial's geographic (SRID 4326) context. Fixed to `ST_Point(40.7580, -73.9857, 4326)`.

7. **Incorrect best practices guidance**: The post recommended "Store longitude first, then latitude." For MySQL 8.0.13+ with SRID 4326, the default axis order is latitude-first. Replaced with accurate guidance about SRS axis order and recommended using `ST_Latitude()`/`ST_Longitude()` for clarity.

## Review Notes
- The `@deg = @radius_km / 111.0` approximation (1 degree latitude ~ 111 km) is labeled as "rough" which is appropriate. It does not account for longitude degree compression at higher latitudes (at 40.7N, 1 degree of longitude ~ 85 km), so the bounding box is not perfectly square geographically. This is acceptable for a tutorial as a pre-filter, since the exact ST_Distance check follows.
- The post could benefit from mentioning `ST_Latitude()` and `ST_Longitude()` functions (introduced in MySQL 8.0.12) as alternatives to `ST_X()`/`ST_Y()` for geographic data, but this is a suggestion rather than a correction.
- The axis order change in MySQL 8.0.13 is a well-known source of confusion. Many older tutorials and StackOverflow answers still use longitude-first convention, which only works with the `axis-order=long-lat` option.
