# Validation Summary: How to Use MULTIPOINT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types
- MULTIPOINT geometry type
- WKT (Well-Known Text) format
- Spatial functions: ST_GeomFromText, ST_NumGeometries, ST_GeometryN, ST_AsText, ST_Envelope, ST_Intersects
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: Spatial Function Reference — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual: ST_GeomFromText — https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html#function_st-geomfromtext
- MySQL 8.0 Reference Manual: Spatial Function Argument Handling — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-argument-handling.html
- MySQL 8.0 Reference Manual: Creating Spatial Indexes — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- OGC Simple Feature Access specification for WKT MULTIPOINT syntax

## Issues Found
- **Coordinate axis order for SRID 4326 was reversed throughout the post.** MySQL 8.0 with SRID 4326 (WGS 84) uses (latitude, longitude) axis order as defined by EPSG, not (longitude, latitude). All WKT coordinate pairs in INSERT statements, query polygon definitions, and example output were written as (longitude, latitude). Fixed by swapping all coordinate pairs to (latitude, longitude) order. This affected: the City Bank MULTIPOINT insert, the Quick Mart MULTIPOINT insert, the Manhattan polygon for ST_Intersects, the bounding box output, the individual point extraction output, and the CTE expansion output.
- **Added a comment in the Syntax section** noting that SRID 4326 uses (latitude, longitude) axis order, since this is a common source of confusion and directly impacts the correctness of all examples in the post.

## Review Notes
- The post correctly notes that MULTIPOINT WKT can be written with or without inner parentheses around each point in MySQL (both forms are accepted).
- The recursive CTE approach for expanding MULTIPOINT to individual rows is correct and idiomatic for MySQL 8.0+.
- The ST_Intersects query logic is correct — it returns true if any point in the MULTIPOINT intersects the polygon.
- The comparison table (MULTIPOINT vs separate POINT rows) provides sound guidance.
- The bounding box output uses `...` abbreviation which is reasonable for display purposes.
- Readers working with other systems (PostGIS, GeoJSON) that default to (longitude, latitude) order should be aware of this MySQL axis order difference when porting code.
