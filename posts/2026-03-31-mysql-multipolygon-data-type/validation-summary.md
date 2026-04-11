# Validation Summary: How to Use MULTIPOLYGON in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (spatial/GIS features)
- SQL (DDL, DML, spatial queries)
- OGC Simple Features / WKT (Well-Known Text)
- SRID 4326 (WGS 84 geographic coordinate system)

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Data Types: https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual — Spatial Analysis Functions: https://dev.mysql.com/doc/refman/8.0/en/spatial-analysis-functions.html
- MySQL 8.0 Reference Manual — ST_Area: https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html#function_st-area
- MySQL 8.0 Reference Manual — ST_GeomFromText: https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html#function_st-geomfromtext
- MySQL 8.0 Reference Manual — Spatial Reference Systems: https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- OGC Simple Features Specification (ISO 19125-1) — MULTIPOLYGON validity rules

## Issues Found

1. **Coordinate axis order (longitude, latitude) was wrong for SRID 4326**: MySQL 8.0 interprets WKT coordinates for SRID 4326 in the axis order defined by the EPSG registry: latitude first, longitude second. All WKT strings in the post used (longitude, latitude) order, which would place the geometries in the wrong geographic location (Southern Ocean instead of NYC). Swapped all coordinate pairs to (latitude, longitude) order throughout the post.

2. **ST_Area returns square meters, not square degrees, for SRID 4326**: For geographic spatial reference systems, `ST_Area` in MySQL 8.0 returns area in square meters. The post labeled the output column `total_area_sq_degrees` and showed tiny Cartesian values like `0.00300000`. Changed the queries to `ROUND(ST_Area(...) / 1000000, 2) AS total_area_sq_km` and updated output values to approximate geodesic areas in square kilometers.

3. **Metro Polygon 2 area was incorrect**: Even in the post's original Cartesian framework, Metro P2 spans 0.040° × 0.030° = 0.0012, but the per-polygon output showed 0.00150000 (same as P1 which is 0.050° × 0.030° = 0.0015). The total Metro area was also wrong (0.003 instead of 0.0027). Fixed in the corrected square-kilometer output.

4. **Mermaid diagram claimed polygons may share "boundary edges or points"**: Per the OGC Simple Features specification, the boundaries of component polygons in a MULTIPOLYGON "may touch at only a finite number of points" — sharing boundary edges (segments) is not allowed. Changed to "May touch at boundary points".

5. **Summary section WKT missing closing parenthesis**: The example `ST_GeomFromText('MULTIPOLYGON(((...)), ((...))', srid)` was missing the closing parenthesis for the MULTIPOLYGON wrapper. Fixed to `'MULTIPOLYGON(((...)), ((...)))'`.

## Review Notes
- The approximate area and centroid output values are based on spherical approximations at ~40.7°N latitude. MySQL's actual geodesic calculations on the WGS84 ellipsoid will produce slightly different exact values, but the order of magnitude and relative proportions are correct.
- The post correctly uses `WITH RECURSIVE` for the numbers table pattern, which requires MySQL 8.0+.
- All spatial functions used (`ST_GeomFromText`, `ST_NumGeometries`, `ST_GeometryN`, `ST_Area`, `ST_Centroid`, `ST_Within`, `ST_Intersects`, `ST_AsText`, `ST_IsValid`) are valid MySQL 8.0 functions.
- The `SPATIAL INDEX` syntax and `SRID 4326` column constraint are correct for MySQL 8.0.
