# Validation Summary: How to Use GEOMETRYCOLLECTION Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types
- GEOMETRYCOLLECTION / GEOMCOLLECTION
- MySQL spatial functions (ST_GeomCollFromText, ST_Collect, ST_NumGeometries, ST_GeometryN, ST_Envelope, ST_Centroid, ST_Contains, ST_AsGeoJSON, MBRContains)
- SRID 4326 (WGS 84) geographic coordinate system
- InnoDB spatial indexes
- Well-Known Text (WKT) format

## Sources Consulted
- [MySQL 8.0 Reference Manual: Spatial Aggregate Functions (ST_Collect)](https://dev.mysql.com/doc/refman/8.0/en/spatial-aggregate-functions.html) -- confirmed ST_Collect() was introduced in MySQL 8.0.24, verified return type behavior
- [MySQL Blog: Axis Order in Spatial Reference Systems](https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/) -- confirmed SRID 4326 uses latitude-first, longitude-second axis order in MySQL 8.0
- [MySQL 8.0 Reference Manual: Spatial Data Types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html) -- verified GEOMETRYCOLLECTION type and GEOMCOLLECTION synonym
- [MySQL 8.0 Reference Manual: Creating Spatial Indexes](https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html) -- verified spatial index support on NOT NULL columns with SRID
- [MySQL 8.4 Reference Manual: Spatial Aggregate Functions](https://dev.mysql.com/doc/refman/8.4/en/spatial-aggregate-functions.html) -- cross-referenced ST_Collect behavior

## Issues Found

### 1. Incorrect coordinate order for SRID 4326 (all SQL examples)
**What was wrong:** All WKT coordinates throughout the post used (longitude, latitude) order -- e.g., `POINT(2.3522 48.8566)` for Paris. MySQL 8.0 with SRID 4326 (WGS 84) expects (latitude, longitude) axis order as defined by the EPSG specification. The incorrect order would place the points in the Gulf of Guinea instead of Paris.

**What was changed:** Swapped all coordinate pairs to (latitude, longitude) order across every SQL example: INSERT statements, query examples, POLYGON/LINESTRING definitions, MBRContains search polygons, and example output. For example, `POINT(2.3522 48.8566)` became `POINT(48.8566 2.3522)`.

**Why:** MySQL 8.0 follows the SRS-defined axis order for geographic SRIDs. For SRID 4326, axis 1 is latitude (north), axis 2 is longitude (east). Using the wrong order produces valid but geographically incorrect results.

### 2. Imprecise MySQL version for ST_Collect()
**What was wrong:** The post stated "In MySQL 8.0+, ST_Collect() aggregates multiple geometries into a collection." ST_Collect() was actually introduced in MySQL 8.0.24, not available in all MySQL 8.0 releases.

**What was changed:** Updated to "In MySQL 8.0.24+" and added a note explaining that ST_Collect() returns the narrowest possible type (MULTIPOINT for all points, MULTILINESTRING for all linestrings, MULTIPOLYGON for all polygons, or GEOMETRYCOLLECTION for mixed types).

**Why:** Users running MySQL 8.0.0-8.0.23 would get an "unknown function" error. The return type clarification is important because the ST_Collect example uses all POINT inputs, which returns MULTIPOINT, not GEOMETRYCOLLECTION as the section title might imply.

## Review Notes
- The GEOMETRY type description in the hierarchy table says "can hold any single geometry" -- GEOMETRY can technically hold any geometry value including collections (a GEOMETRYCOLLECTION is still a single geometry value), so this is not incorrect but could be slightly clearer as "can hold any geometry type."
- The post's ST_Contains example with a GEOMETRYCOLLECTION as the container geometry is valid SQL, though ST_Contains behavior with GEOMETRYCOLLECTION can be nuanced -- it checks if the second geometry is within any element of the collection. This is correct as demonstrated.
- The `axis-order` option parameter (e.g., `ST_GeomFromText(..., 4326, 'axis-order=long-lat')`) is available if users prefer longitude-first order, but the post correctly uses the default SRS-defined order after the fix.
