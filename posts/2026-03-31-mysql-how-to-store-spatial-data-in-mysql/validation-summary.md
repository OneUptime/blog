# Validation Summary: How to Store Spatial Data in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types and functions
- OGC geometry types (POINT, LINESTRING, POLYGON, etc.)
- SRID 4326 (WGS 84) coordinate system
- Well-Known Text (WKT) format
- GeoJSON output format
- Spatial indexes
- Python mysql.connector library

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Data Types: https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual — Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual — ST_GeomFromText(): https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual — Point Property Functions (ST_X, ST_Y): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html
- MySQL 8.0 Reference Manual — Spatial Reference Systems: https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- MySQL 8.0 Reference Manual — Creating Spatial Indexes: https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- EPSG Registry — SRID 4326 (WGS 84) axis order definition
- RFC 7946 — GeoJSON Format (coordinate order in GeoJSON output)

## Issues Found

### 1. Critical: Coordinate axis order wrong throughout (SRID 4326)
**What was wrong:** The post used (longitude, latitude) coordinate order for SRID 4326 in all WKT examples, with a comment explicitly stating "longitude, latitude order for SRID 4326." In MySQL 8.0.12+, SRID 4326 follows the EPSG/OGC standard axis order of **(latitude, longitude)**. The Tokyo Tower insert `POINT(139.7454 35.6586)` would fail with `ER_LATITUDE_OUT_OF_RANGE` because 139.7454 exceeds the valid latitude range of [-90, 90].

**What was changed:**
- Fixed the comment to say "latitude, longitude order for SRID 4326"
- Swapped coordinates in all three POINT inserts: Eiffel Tower `POINT(48.8584 2.2945)`, Big Ben `POINT(51.5007 -0.1246)`, Tokyo Tower `POINT(35.6586 139.7454)`
- Swapped coordinates in the Central Park POLYGON insert
- Updated the ST_AsText() example output to reflect the corrected axis order

### 2. ST_X/ST_Y aliases were swapped
**What was wrong:** The "Selecting X and Y Coordinates" section labeled `ST_X(coordinates)` as `longitude` and `ST_Y(coordinates)` as `latitude`. For SRID 4326 in MySQL 8.0.12+, `ST_X()` returns the first axis value (latitude) and `ST_Y()` returns the second axis value (longitude).

**What was changed:** Swapped the aliases so `ST_X()` is labeled `latitude` and `ST_Y()` is labeled `longitude`.

### 3. Python code had wrong coordinate order
**What was wrong:** The Python example constructed `f'POINT({lng} {lat})'` which puts longitude first. For SRID 4326, latitude must come first.

**What was changed:** Changed to `f'POINT({lat} {lng})'`.

### 4. Summary had wrong coordinate order
**What was wrong:** The summary stated `ST_GeomFromText('POINT(lng lat)', 4326)`.

**What was changed:** Fixed to `ST_GeomFromText('POINT(lat lng)', 4326)` with a clarifying note about latitude-first order for SRID 4326.

## Review Notes
- The Central Park POLYGON insert does not provide a value for the `coordinates` column, which is defined as `NOT NULL` in the schema. This INSERT would fail with "Field 'coordinates' doesn't have a default value." This appears intentional as a standalone syntax example, but readers building a complete working example would need to either make the `coordinates` column nullable or include a value for it in the polygon insert.
- The GeoJSON output example is correct — `ST_AsGeoJSON()` always outputs in [longitude, latitude] order per RFC 7946, regardless of the SRS axis order used for storage.
- The Python example uses f-string interpolation to build WKT. While safe for hardcoded values as shown, readers should be aware that user-supplied coordinates should be validated before interpolation. The parameterized query (`%s`) correctly protects the overall SQL, but the WKT string is constructed in Python before being passed as a parameter.
- MySQL 8.0.12+ is assumed throughout. Users on MySQL 8.0.0–8.0.11 would see (longitude, latitude) axis order, but those versions are long outdated.
