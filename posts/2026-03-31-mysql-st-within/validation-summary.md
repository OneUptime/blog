# Validation Summary: How to Use ST_Within() in MySQL for Containment Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- SQL (DDL, DML, stored functions)
- SRID 4326 (WGS 84) geographic spatial reference system
- ST_Within(), ST_Contains(), ST_Intersects(), MBRWithin()
- Spatial indexes (R-tree)

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual — ST_Within(): https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Reference Manual — Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual — Spatial Index Optimization: https://dev.mysql.com/doc/refman/8.0/en/spatial-index-optimization.html
- MySQL Blog — Axis Order in Spatial Reference Systems: https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/

## Issues Found

### 1. SRID 4326 coordinate order was wrong (all POINT and POLYGON values)
**What was wrong:** All geometry literals used longitude-latitude order (e.g., `POINT(-74.000 40.715)`), but MySQL 8.0 with SRID 4326 expects latitude-longitude order per the EPSG definition of WGS 84.
**What was changed:** Swapped all coordinate pairs in POINT and POLYGON WKT strings to latitude-longitude order (e.g., `POINT(40.715 -74.000)`).
**Why:** MySQL 8.0.12+ follows the SRS-defined axis order for geographic reference systems. SRID 4326 (EPSG:4326) defines axes as [Latitude, Longitude]. Using the wrong order would place geometries at incorrect geographic locations and produce wrong results for distance calculations and other geographic computations.

### 2. ST_X()/ST_Y() used instead of ST_Longitude()/ST_Latitude()
**What was wrong:** The "Find All Stores Inside a Region" query used `ST_X(location) AS lon, ST_Y(location) AS lat`. For SRID 4326, ST_X() returns the first axis (latitude), not longitude. The aliases were backwards.
**What was changed:** Replaced with `ST_Longitude(location) AS lon, ST_Latitude(location) AS lat`, which are the dedicated geographic coordinate accessors introduced in MySQL 8.0.12.
**Why:** ST_Longitude() and ST_Latitude() are unambiguous for geographic SRS and return the correct coordinate regardless of the underlying axis order, making the code more portable and less error-prone.

### 3. East coast query expected output was missing Store D
**What was wrong:** The expected output for the east coast bounding box query showed only Store A and Store B. Store D at (lat 40.680, lon -73.940) is within the east coast bounding box (lat 38–45, lon -80 to -70) and should also appear.
**What was changed:** Added Store D to the expected output table.
**Why:** Store D's coordinates (Brooklyn, NY area) fall within the defined east coast bounding polygon, so it must be returned by the ST_Within query.

## Review Notes
- The claim that "MySQL can use the spatial index on the second argument of ST_Within and ST_Contains" is a common simplification. In MySQL 8.0, the optimizer can utilize spatial indexes on either argument of spatial functions, but the advice to index the column used in the containing-geometry position is still a reasonable heuristic for typical query patterns.
- The stored function `is_in_delivery_zone` accepts a POINT without SRID constraint. It works correctly when the caller passes SRID 4326, but would fail with an SRID mismatch error if called with SRID 0 or another SRS. This is acceptable for a tutorial but worth noting for production use.
- ST_Longitude() and ST_Latitude() are only available in MySQL 8.0.12+. The post does not specify a minimum MySQL version, but all features used (SRID column constraints, geographic spatial computation, ST_Latitude/ST_Longitude) require MySQL 8.0.12 or later.
