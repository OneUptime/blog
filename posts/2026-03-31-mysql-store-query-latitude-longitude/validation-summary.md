# Validation Summary: How to Store and Query Latitude/Longitude in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (spatial data types, spatial functions, spatial indexes)
- SQL (DDL, DML, spatial queries)
- Python (mysql.connector library)
- WGS 84 / SRID 4326 coordinate reference system

## Sources Consulted
- MySQL 8.0 Reference Manual: Point Property Functions (ST_X, ST_Y, ST_Latitude, ST_Longitude) — https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual: Creating Spatial Columns — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-columns.html
- MySQL 5.7 Reference Manual: Creating Spatial Columns — https://dev.mysql.com/doc/refman/5.7/en/creating-spatial-columns.html

## Issues Found

### 1. ST_X() and ST_Y() swapped in retrieval query
**What was wrong:** The "Retrieving Coordinates" section used `ST_Y(coords) AS latitude` and `ST_X(coords) AS longitude`. Per the MySQL 8.0 documentation, for SRID 4326 (geographic SRS), `ST_X()` returns the first axis value (latitude) and `ST_Y()` returns the second axis value (longitude). The MySQL docs confirm: "As of MySQL 8.0.12, the X coordinate is considered to refer to the axis that appears first in the Point spatial reference system (SRS) definition." For SRID 4326, the first axis is latitude. Additionally, the docs state that `ST_Latitude()` is equivalent to `ST_X()` for geographic SRS points.

**What was changed:** Swapped to `ST_X(coords) AS latitude` and `ST_Y(coords) AS longitude`.

**Why:** The original code would return longitude labeled as latitude and vice versa, producing silently incorrect results.

### 2. Compatibility version incorrect
**What was wrong:** The comparison table listed POINT column compatibility as "MySQL 5.7.6+" but the code examples use column-level SRID constraints (`POINT NOT NULL SRID 4326`), which are only available in MySQL 8.0+. The MySQL 5.7 documentation does not mention SRID column constraints at all.

**What was changed:** Updated from "MySQL 5.7.6+" to "MySQL 8.0+".

**Why:** Readers on MySQL 5.7 would get syntax errors trying to use the CREATE TABLE statement as written.

## Review Notes
- The distance formula labeled as "Haversine formula" is technically the Spherical Law of Cosines (`R * acos(sin(lat1)*sin(lat2) + cos(lat1)*cos(lat2)*cos(dlon))`), not the Haversine formula. Both compute great-circle distance and produce identical results. This conflation is extremely common in tutorials and does not affect correctness of the output, so it was left as-is.
- The Python example uses an f-string to build the WKT string (`f'POINT({lat} {lng})'`), which is passed as a parameterized query value. This is safe in the example since `lat` and `lng` are hardcoded floats, but in production code with user-supplied values, input validation would be advisable.
- For clarity in new code, `ST_Latitude()` and `ST_Longitude()` (introduced in MySQL 8.0) are preferred over `ST_X()` and `ST_Y()` for geographic SRS points, as they are unambiguous. The post could mention these as an alternative in a future update.
- `DECIMAL(10, 7)` precision claim of "centimeter-level" is correct: 10^-7 degrees of latitude is approximately 1.1 cm at any point on Earth.
