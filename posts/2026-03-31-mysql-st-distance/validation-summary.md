# Validation Summary: How to Use ST_Distance() in MySQL for Distance Calculations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_Distance() (geodetic/Cartesian distance)
- ST_Distance_Sphere() (spherical approximation)
- SRID 4326 (WGS 84) coordinate reference system
- Spatial indexes and MBRContains for performance optimization

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Function Argument Handling — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-argument-handling.html
- MySQL 8.0 Reference Manual: ST_Distance — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Reference Manual: ST_Distance_Sphere — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ST_UNITS_OF_MEASURE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-st-units-of-measure-table.html
- MySQL Blog: Axis Order in Spatial Reference Systems — https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/
- MySQL 8.0.14 Release Notes (unit parameter addition) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-14.html

## Issues Found

### 1. CRITICAL: POINT coordinate order reversed for SRID 4326 (all examples)
**What was wrong:** All `POINT()` values used `POINT(longitude latitude)` order (e.g., `POINT(-74.0060 40.7128)` for New York). In MySQL 8.0.12+, SRID 4326 uses the EPSG-standard axis order of latitude first, longitude second. The Los Angeles entry `POINT(-118.2437 34.0522)` would fail with `ER_LATITUDE_OUT_OF_RANGE` since -118.2437 exceeds the valid latitude range of [-90, 90].

**What was changed:** Swapped all POINT coordinates to `POINT(latitude longitude)` format throughout the post — in the INSERT statement, the radius query, the unit conversion example, and the bounding box performance pattern. For example, New York changed from `POINT(-74.0060 40.7128)` to `POINT(40.7128 -74.0060)`.

**Why:** MySQL 8.0.12+ respects the SRS-defined axis order. For SRID 4326 (WGS 84), the EPSG definition specifies latitude as the first axis and longitude as the second. The default `axis-order=srid-defined` option enforces this.

### 2. Output table: city name order and sort order incorrect
**What was wrong:** Three rows in the "Calculate Distance Between All City Pairs" output had city_1 and city_2 reversed (e.g., "Houston | Los Angeles" instead of "Los Angeles | Houston"). Since the query uses `c1.id < c2.id` and cities are inserted in order (NY=1, LA=2, CHI=3, HOU=4, LON=5, PAR=6), city_1 always has the lower ID. Additionally, the row with distance 2206.5 appeared after 3935.7, violating the `ORDER BY distance_km` clause.

**What was changed:** Fixed the three reversed rows to show correct city_1/city_2 order and re-sorted all rows by ascending distance_km.

### 3. POLYGON bounding box coordinates reversed
**What was wrong:** The dynamically constructed POLYGON in the bounding box performance pattern used `POINT(longitude latitude)` order, matching the same error as the POINT values.

**What was changed:** Swapped the POLYGON vertex coordinates to `POINT(latitude longitude)` order consistent with SRID 4326.

### 4. Comparison table: ST_Distance_Sphere input types
**What was wrong:** The comparison table listed ST_Distance_Sphere input as "POINT only". Per MySQL documentation, ST_Distance_Sphere accepts both POINT and MULTIPOINT arguments.

**What was changed:** Updated "POINT only" to "POINT, MULTIPOINT".

## Review Notes
- The output table for "Calculate Distance Between All City Pairs" shows 10 of the 15 possible city pairs (C(6,2)=15). Five pairs are missing: Los Angeles-Chicago, Chicago-London, Chicago-Paris, Houston-London, and Houston-Paris. This does not affect correctness of the shown results but readers may notice the incomplete output.
- The `'mile'` unit name used in the ST_Distance unit parameter example appears to be valid per MySQL's INFORMATION_SCHEMA.ST_UNITS_OF_MEASURE table, but readers should verify available unit names for their MySQL version by querying `SELECT * FROM INFORMATION_SCHEMA.ST_UNITS_OF_MEASURE;`.
- The geodetic vs spherical distance comparison (London-Paris) shows identical values at 1 decimal place (341.5 km). For short distances, the difference between ellipsoidal and spherical models is negligible; the difference becomes more apparent at intercontinental distances.
- The default earth radius for ST_Distance_Sphere with Cartesian (SRID 0) points is 6,370,986 meters. For geographic SRS points, the radius is derived from the SRS ellipsoid parameters.
