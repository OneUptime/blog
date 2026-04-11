# Validation Summary: How to Use ST_MakeEnvelope() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (spatial functions)
- SQL spatial data types (POINT, POLYGON, LINESTRING)
- Spatial indexing (R-tree)
- GIS / coordinate reference systems

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Convenience Functions: https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 5.7.6 Release Notes (ST_MakeEnvelope introduction): https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-6.html
- MySQL 5.7 Reference Manual — Spatial Convenience Functions: https://dev.mysql.com/doc/refman/5.7/en/spatial-convenience-functions.html
- MySQL Blog — Axis Order in Spatial Reference Systems: https://dev.mysql.com/blog-archive/axis-order-in-spatial-reference-systems/

## Issues Found

1. **Incorrect version claim (line 15)**: The post stated ST_MakeEnvelope() was introduced in MySQL 8.0.22. It was actually introduced in **MySQL 5.7.6**. Fixed to 5.7.6.

2. **Oversimplified return type (line 23)**: The post claimed the function always returns a POLYGON with five points. Per the docs, it returns a POINT if both inputs are equal, a LINESTRING if they are collinear, or a POLYGON otherwise. Updated the description to cover all three cases.

3. **Critical: Geographic SRS not supported (multiple sections)**: ST_MakeEnvelope() does **not** support geographic spatial reference systems. Passing SRID 4326 (WGS 84) raises `ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS`. The post's "Map Viewport Query" example, "MBRContains" example, and "SRID Requirement" example all used SRID 4326 and would have failed at runtime. All examples were rewritten to use SRID 0 (Cartesian coordinates), and the geographic SRS limitation was documented in the syntax section, SRID section, and summary.

4. **SRID section expanded**: Added a second example demonstrating the geographic SRS error with SRID 4326, in addition to the existing SRID mismatch example.

## Review Notes
- The function works with any Cartesian SRS (SRID 0 or projected coordinate systems), but not with geographic SRSs. Users needing bounding-box queries on geographic data (lat/lon) should construct the polygon manually with ST_GeomFromText or use ST_Buffer with appropriate transformations.
- The comparison between ST_MakeEnvelope and manual POLYGON construction is accurate for Cartesian coordinates.
