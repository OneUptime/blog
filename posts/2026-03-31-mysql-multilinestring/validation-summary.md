# Validation Summary: How to Use MULTILINESTRING in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types
- MULTILINESTRING geometry type
- MySQL spatial functions (ST_GeomFromText, ST_NumGeometries, ST_GeometryN, ST_Length, ST_AsText, ST_IsClosed, ST_Envelope, ST_Intersects, ST_Collect)
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: Spatial Function Argument Handling — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-argument-handling.html
- MySQL 8.0 Reference Manual: Spatial Aggregate Functions (ST_Collect) — https://dev.mysql.com/doc/refman/8.0/en/spatial-aggregate-functions.html
- MySQL 8.0 Reference Manual: LineString and MultiLineString Property Functions — https://dev.mysql.com/doc/refman/8.0/en/gis-linestring-property-functions.html
- MySQL Blog: Axis Order in Spatial Reference Systems — https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL Blog: Geographic Spatial Reference Systems in MySQL 8.0 — https://dev.mysql.com/blog-archive/geographic-spatial-reference-systems-in-mysql-8-0/

## Issues Found

1. **Missing `axis-order=long-lat` option on ST_GeomFromText calls**: The blog uses (longitude, latitude) coordinate order throughout, but MySQL 8.0.12+ defaults to (latitude, longitude) axis order for SRID 4326 per the EPSG definition. Without specifying `'axis-order=long-lat'`, MySQL would interpret the first coordinate as latitude, placing the geometries at wrong geographic positions (~74°S instead of ~41°N) and producing incorrect geodetic distance calculations. Added the `'axis-order=long-lat'` option to all four ST_GeomFromText calls (three INSERTs and the midtown box polygon).

2. **Query Route Properties: incorrect `total_length_degrees` alias and output values**: With SRID 4326, `ST_Length()` returns geodetic length in meters, not coordinate-unit degrees. The alias was `total_length_degrees` with sub-1 degree-scale values (0.132, 0.0245, 0.093), directly contradicting the later section that correctly explains ST_Length returns meters. Changed alias to `total_length_meters`, changed `ROUND(ST_Length(segments), 6)` to `ROUND(ST_Length(segments))` (6 decimal places is excessive for meter values), and updated output to approximate geodetic meter values (~14125, ~8062, ~2321).

3. **Query Route Properties: incorrect output row ordering**: The output showed M15 > A Train > Greenway, but with DESC ordering by length, the correct order is M15 (~14125m) > Greenway (~8062m) > A Train (~2321m). Fixed the row order.

4. **Extract Individual Segments: segment_1 output missing middle point**: The A Train's first LINESTRING has 3 input points but the output showed only 2 points with incorrectly truncated coordinates. Changed from `LINESTRING(-73.9857 40.758,-73.979 40.765)` to `LINESTRING(-73.9857 40.758,-73.9792 40.7614,-73.9723 40.765)`.

5. **ST_Intersects: incomplete result set**: The output showed only A Train intersecting the midtown box, but all three routes have segments passing through the defined polygon area (lon -74.010 to -73.960, lat 40.745 to 40.770). M15 Bus segments pass through at lon -73.973 and -73.960; Hudson River Greenway segment 1 passes through at lon -74.009, lat up to 40.760. Added all three routes to the output.

## Review Notes
- The approximate meter values in the Query Route Properties output (14125, 8062, 2321) are geodetic estimates computed using the WGS 84 ellipsoidal model. Actual MySQL output may differ slightly due to the exact Vincenty/Karney algorithm implementation.
- The `ST_Collect` function reference (MySQL 8.0.24+) was verified as correct.
- The `ST_IsClosed` behavior on MULTILINESTRING (checks all members) was verified as correct.
- The general best practices and comparison table (MULTILINESTRING vs separate LINESTRING rows) are reasonable and accurate.
