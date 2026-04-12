# Validation Summary: How to Find Points Within a Radius in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (spatial functions, GIS)
- ST_Distance_Sphere()
- ST_Buffer() / ST_Within()
- Haversine formula (spherical law of cosines)
- SRID 4326 (WGS 84)
- Spatial indexes

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Function Reference (ST_Distance_Sphere, ST_Buffer, ST_Within, ST_GeomFromText): https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual — Spatial Data Types (POINT, SRID): https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual — Spatial Reference Systems (axis order for SRID 4326): https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- EPSG:4326 definition (axis order: latitude, longitude): https://epsg.io/4326
- Spherical law of cosines / Haversine formula reference for great-circle distance calculation

## Issues Found
- **ST_Buffer() compatibility with SRID 4326**: The original note for Approach 2 only mentioned that `ST_Buffer()` produces an "elliptical approximation." In reality, `ST_Buffer()` does not support geographic spatial reference systems (SRID 4326) in many MySQL 8.0 versions and will raise an error. Updated the note to warn about version compatibility and recommend `ST_Distance_Sphere()` (Approach 1) as the preferred alternative.

## Review Notes
- **Spatial index not used by ST_Distance_Sphere()**: Approach 1 creates a `SPATIAL INDEX` on the `coords` column, but `ST_Distance_Sphere()` in a WHERE clause cannot leverage spatial indexes. Spatial indexes are only used by MBR-based predicates (e.g., `MBRContains`, `ST_Within`). The post does not make an explicit false claim about the index, but readers might assume it helps with the ST_Distance_Sphere query. For large tables, combining an MBR bounding-box filter with ST_Distance_Sphere would be the optimal approach.
- **ST_Distance_Sphere called twice in Approach 1**: The function is called once in SELECT and once in WHERE. For large tables this doubles the computation. A subquery or CTE could avoid the duplicate call, but this is a performance optimization, not a correctness issue.
- **HAVING without GROUP BY**: The Haversine queries use `HAVING distance_km <= @radius_km` without a GROUP BY clause. This is valid MySQL-specific behavior that allows filtering on column aliases without grouping, but it is not standard SQL and would fail in other databases.
