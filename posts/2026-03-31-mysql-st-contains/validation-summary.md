# Validation Summary: How to Use ST_Contains() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Spatial Functions (ST_Contains, ST_Within, ST_Intersects)
- Spatial Indexes
- GIS / Geometry types (POLYGON, POINT)

## Sources Consulted
- MySQL 8.0 Spatial Relation Functions (Object Shapes): https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html
- MySQL 8.0 Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 9.6 Spatial Function Reference: https://dev.mysql.com/doc/refman/9.6/en/spatial-function-reference.html
- MySQL 8.0 SPATIAL Index Optimization: https://dev.mysql.com/doc/refman/8.0/en/spatial-index-optimization.html
- MySQL 8.0 Using Spatial Indexes: https://dev.mysql.com/doc/refman/8.0/en/using-spatial-indexes.html
- DE-9IM Wikipedia Article: https://en.wikipedia.org/wiki/DE-9IM
- PostGIS ST_Contains Documentation (for cross-reference): https://postgis.net/docs/ST_Contains.html

## Issues Found
1. **ST_Covers() does not exist in MySQL**: The post referenced `ST_Covers()` in the Edge Cases section (code example) and Summary as the boundary-inclusive alternative to `ST_Contains()`. However, `ST_Covers()` is a PostGIS/SQL Server function and has never been added to any version of MySQL (verified from MySQL 5.7 through 9.6). Replaced all references to `ST_Covers()` with `ST_Intersects()`, which correctly returns 1 for points both inside and on the boundary of a polygon in MySQL.

2. **Misleading spatial index advice**: The Performance Tips section stated "Add a SPATIAL INDEX on the geometry column used as g2 for faster lookups." This is misleading because the spatial index should be on whichever geometry column is stored in the table, regardless of whether it appears as g1 or g2 in the ST_Contains call. The post's own examples demonstrate this — in `ST_Contains(boundary, @location)`, the indexed column `boundary` is g1, not g2. Changed the tip to correctly state "on whichever geometry column is stored in your table."

## Review Notes
- The DE-9IM definition of ST_Contains (interiors must share at least one point) is correct per the OGC standard, though MySQL's own documentation uses simpler language and does not explicitly reference the DE-9IM model.
- The boundary behavior claim (ST_Contains returns 0 for boundary points) is correct per the DE-9IM pattern `T*****FF*`.
- The GPS coordinate examples use default SRID 0 (Cartesian), which works for demonstrating containment but would not give geographically accurate results for real-world applications. The post appropriately mentions SRID alignment in the Performance Tips.
- ST_Transform() was added in MySQL 8.0.13; the "(if available)" caveat in the post is appropriate.
