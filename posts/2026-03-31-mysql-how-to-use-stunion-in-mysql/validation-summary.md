# Validation Summary: How to Use ST_Union() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL Spatial Functions (ST_Union, ST_AsText, ST_Area, ST_GeomFromText, ST_GeometryType, ST_Intersection, ST_Difference, ST_SymDifference)
- WKT (Well-Known Text) geometry format
- GIS / Geospatial concepts (polygon union, multipolygon, geometry collections)

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Analysis Functions — ST_Union() https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html#function_st-union
- MySQL 8.0 Reference Manual: Spatial Analysis Functions — ST_Area() https://dev.mysql.com/doc/refman/8.0/en/gis-polygon-property-functions.html#function_st-area
- MySQL 8.0 Reference Manual: Spatial Data Types https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- MySQL 8.0 Reference Manual: ST_GeomCollFromText() https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html#function_st-geomcollfromtext

## Issues Found
1. **Aggregation example referenced non-existent data**: The "Aggregating Multiple Zones Into One" section used a query filtering for `z1.id = 1 AND z2.id = 2 AND z3.id = 3`, but only 2 zones (id 1 and 2) were inserted into the `delivery_zones` table earlier in the post. The query would return an empty result set. Fixed by adding an INSERT statement for a third zone ("Zone C") before the aggregation query.

## Review Notes
- All SQL syntax is correct and uses current MySQL 8.0 spatial functions (ST_ prefix, not deprecated GIS functions).
- All polygon WKT definitions are properly closed (first point equals last point).
- The area calculation (28 = 16 + 16 - 4 overlap) is mathematically correct for the given polygons.
- The claim that MySQL lacks an aggregate ST_Union() is accurate. MySQL 8.0.24+ added ST_Collect() as an aggregate function, but that produces a GEOMETRYCOLLECTION rather than a geometric union.
- The comparison between ST_Union and GEOMETRYCOLLECTION is accurate and useful.
- The related spatial functions table is correct.
