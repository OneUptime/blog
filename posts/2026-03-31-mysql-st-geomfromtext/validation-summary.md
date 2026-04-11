# Validation Summary: How to Use ST_GeomFromText() in MySQL for Geospatial Queries

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0 spatial functions
- ST_GeomFromText() and type-specific WKT parsing functions
- Well-Known Text (WKT) geometry format
- SRID 4326 (WGS 84) coordinate reference system
- Spatial indexing and spatial query predicates (ST_Within, ST_Distance_Sphere)
- Prepared statements for parameterized spatial queries

## Sources Consulted
- MySQL 8.0 Reference Manual — Functions That Create Geometry Values from WKT Values: https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual — Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual — MySQL-Specific Functions That Create Geometry Values (Point constructor): https://dev.mysql.com/doc/refman/8.0/en/gis-mysql-specific-functions.html
- MySQL 8.0 Reference Manual — General Geometry Property Functions (ST_SRID setter): https://dev.mysql.com/doc/refman/8.0/en/gis-general-property-functions.html
- MySQL Developer Blog — Axis Order in Spatial Reference Systems: https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/

## Issues Found

1. **Incorrect coordinate axis order for SRID 4326 (critical):** All WKT examples used longitude-first, latitude-second order (e.g., `POINT(-74.006 40.7128)`). MySQL 8.0 (since 8.0.13) follows the SRS-defined axis order for geographic SRIDs, which for SRID 4326 (WGS 84) is latitude first, longitude second. All coordinates throughout the post were flipped to the correct lat-lon order (e.g., `POINT(40.7128 -74.006)`). The explanatory text was also corrected from "The WKT format uses X (longitude) first, then Y (latitude)" to accurately describe MySQL 8.0's SRS-dependent axis order behavior.

2. **ST_MakePoint does not exist in MySQL:** The comparison section "ST_GeomFromText vs ST_MakePoint" referenced `ST_MakePoint()`, which is a PostGIS (PostgreSQL) function and does not exist in MySQL. Replaced with MySQL's `Point(x, y)` constructor function, which is the correct MySQL equivalent for creating a POINT from numeric coordinate arguments. Updated the section heading, comparison table, and code example accordingly.

3. **Incorrect ST_Within expected output:** The expected output for the ST_Within query only showed Times Square and Empire State Bldg, but Central Park S (40.7648, -73.9730) is also within the search polygon (lat 40.740–40.770, lon -74.010–-73.960). Added Central Park S to the expected result set.

4. **Incorrect ST_Distance_Sphere values:** The distance values (1069, 1488, 6094) were computed with the wrong axis order, placing the points at incorrect geographic locations. Updated to corrected approximate values (1068, 1296, 5849) consistent with the actual NYC landmark coordinates under the correct lat-lon axis order.

5. **Mermaid diagram axis order:** The flowchart showed `'POINT(lon lat)'`. Corrected to `'POINT(lat lon)'` to match SRID 4326 axis order.

6. **Best Practices bullet on coordinate order:** Changed from "Remember the WKT order is X (longitude) first, Y (latitude) second" to "Remember that for SRID 4326 in MySQL 8.0, the default axis order is latitude first, longitude second."

## Review Notes
- MySQL 8.0.13+ also supports a three-argument form `ST_GeomFromText(wkt, srid, options)` where the `options` parameter can include `axis-order=long-lat` to override the default SRS axis order. This is not mentioned in the post but is a useful feature for users who prefer longitude-first conventions. This is an omission rather than an error, so it was not added.
- The `ST_GeomFromText` syntax section correctly includes all type-specific aliases. The function signatures are accurate.
- The CREATE TABLE syntax with `POINT NOT NULL SRID 4326` and `SPATIAL INDEX` is correct for MySQL 8.0.
- The prepared statement example correctly demonstrates parameterized WKT input for SQL injection prevention.
- The ST_Distance_Sphere values are approximate calculations; exact values may vary slightly depending on MySQL's internal earth radius constant (6,370,986.0 m).
