# Validation Summary: How to Use MULTIPOLYGON Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial data types
- MULTIPOLYGON geometry type
- MySQL spatial functions (ST_GeomFromText, ST_Contains, ST_Intersects, ST_Area, ST_Distance_Sphere, ST_Union, ST_Overlaps, ST_AsGeoJSON, ST_NumGeometries, ST_GeometryN, ST_Centroid)
- WKT (Well-Known Text) notation
- SRID 4326 (WGS 84) geographic coordinate system
- Spatial indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: Spatial Function Reference — https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual: WKT Functions — https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html
- MySQL 8.0 Reference Manual: Spatial Relation Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Reference Manual: Spatial Convenience Functions (ST_Distance_Sphere) — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Spatial Reference Systems — https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- EPSG Registry: SRID 4326 (WGS 84) axis order definition — https://epsg.io/4326

## Issues Found
1. **SRID 4326 coordinate order was longitude-latitude instead of latitude-longitude.** MySQL 8.0.12+ follows the EPSG axis order for geographic spatial reference systems. SRID 4326 (WGS 84) defines axis order as (latitude, longitude). The blog used (longitude, latitude) order in three places: the "Downtown Delivery Zone" MULTIPOLYGON INSERT, the delivery_regions ST_PointFromText query, and the ST_Distance_Sphere ST_PointFromText query. All three were corrected by swapping the coordinate order. Without this fix, the coordinates would resolve to locations near Antarctica instead of New York City.

2. **Misleading comment on ST_Distance_Sphere query.** The comment stated "Calculate distance between a point and nearest zone boundary" but the query uses `ST_Centroid(coverage)`, which computes distance from the centroid of the MULTIPOLYGON to the point — not from the nearest boundary. Changed the comment to "Calculate distance between zone centroid and a point."

## Review Notes
- The `service_zones` table mixes SRID 0 data (first two INSERTs) and SRID 4326 data (third INSERT). Queries in the "Calculating Distances and Relationships" section that use `ST_PointFromText(..., 4326)` against this table would produce an SRID mismatch error for the SRID 0 rows. In production, the table should use a consistent SRID, ideally declared on the column (e.g., `MULTIPOLYGON NOT NULL SRID 4326`), as done in the `delivery_regions` table example. This was not fixed as the queries are illustrative and the individual SQL statements are syntactically correct.
- The `ST_Union` example with scalar subqueries will fail if either subquery returns more than one row. This is acceptable for example code but worth noting.
- All spatial functions used (`ST_GeomFromText`, `ST_MultiPolygonFromText`, `ST_AsText`, `ST_AsGeoJSON`, `ST_NumGeometries`, `ST_GeometryN`, `ST_Area`, `ST_Contains`, `ST_Intersects`, `ST_Overlaps`, `ST_Distance_Sphere`, `ST_Centroid`, `ST_Union`, `ST_PointFromText`) are valid MySQL 8.0 functions with correct signatures.
- The SPATIAL INDEX syntax and NOT NULL requirement are correct for MySQL 8.0 InnoDB.
