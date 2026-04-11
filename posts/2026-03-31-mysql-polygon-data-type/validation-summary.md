# Validation Summary: How to Use POLYGON Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types
- POLYGON geometry type
- WKT (Well-Known Text) format
- SRID 4326 (WGS 84) geographic coordinate reference system
- MySQL spatial functions: ST_GeomFromText, ST_Area, ST_Centroid, ST_Within, ST_Intersects, ST_ExteriorRing, ST_NumInteriorRings, ST_IsValid, ST_Buffer
- Spatial indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: Polygon and MultiPolygon Property Functions — https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html
- MySQL 8.0 Reference Manual: Spatial Function Argument Handling — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-argument-handling.html
- MySQL Blog: Axis Order in Spatial Reference Systems — https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL Blog: Geographic Spatial Reference Systems in MySQL 8.0 — https://dev.mysql.com/blog-archive/geographic-spatial-reference-systems-in-mysql-8-0/
- MySQL 8.0 Reference Manual: Spatial Relation Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html

## Issues Found

1. **Coordinate axis order (MAJOR)**: All WKT strings used longitude-latitude order (e.g., `POLYGON((-74.020 40.700, ...))`). MySQL 8.0.12+ with SRID 4326 expects latitude-longitude order per the WGS 84 standard. Swapped all coordinate pairs to lat-lon order throughout the post.

2. **ST_Area units (MAJOR)**: The query aliased `ST_Area()` output as `area_sq_degrees` and showed values like 0.00150000. With SRID 4326 in MySQL 8.0+, `ST_Area()` returns geodesic area in square meters, not square degrees. Changed alias to `area_sq_meters` and updated output values to realistic square meter values (~14 million m² for the NYC zones, ~3.6 million m² for the Chicago zone).

3. **ST_Perimeter does not exist in MySQL**: The syntax section listed `ST_Perimeter(polygon)` but MySQL does not have this function. Changed to `ST_Length(ST_ExteriorRing(polygon))` which is the correct MySQL equivalent.

4. **Incorrect "triangular" comment**: The insert comment said "Simple triangular delivery zones" but the polygons are rectangles (4 unique vertices + closing point). Changed to "rectangular".

5. **Interior ring orientation**: The polygon-with-hole example had the interior ring in counter-clockwise order (same as exterior). For geographic SRS in MySQL 8.0, interior rings must be clockwise. Reversed the inner ring vertex order.

6. **Bad ST_Transform advice**: Best Practices suggested `ST_Area(ST_Transform(boundary, 3857))` for area in square meters. SRID 3857 (Web Mercator) severely distorts areas away from the equator, making this bad advice. Replaced with a note that SRID 4326 in MySQL 8.0+ returns geodesic area in square meters automatically.

7. **Intersection query edge case**: The search area's northern boundary at lat 40.740 exactly touched Midtown Zone's southern boundary, which would cause `ST_Intersects` to return true for both zones (not just Downtown Zone as shown). Adjusted the search area boundary from 40.740 to 40.735 to avoid the touching-boundary issue.

8. **Centroid WKT in output table**: Updated centroid values to lat-lon order (e.g., `POINT(40.715 -73.995)` instead of `POINT(-73.995 40.715)`) to match SRID 4326's default axis order in `ST_AsText()`.

9. **Summary coordinate order**: Changed `POLYGON((lon lat, ...))` to `POLYGON((lat lon, ...))` and added a note about SRID 4326's axis order.

## Review Notes
- The ST_Area values in the output table are approximate geodesic calculations. Exact values depend on MySQL's WGS 84 ellipsoidal computation and may differ slightly from the estimates shown.
- The `ST_Buffer(boundary, 0)` repair trick in the Validation section is a pattern borrowed from PostGIS. It works in MySQL 8.0.24+ for geographic SRS but may behave differently in older versions.
- The `axis-order=long-lat` option (available in MySQL 8.0.13+) can be passed to `ST_GeomFromText()` if developers prefer the more common lon-lat convention used in GeoJSON and PostGIS, but the post correctly teaches the default SRID-defined axis order after the fix.
