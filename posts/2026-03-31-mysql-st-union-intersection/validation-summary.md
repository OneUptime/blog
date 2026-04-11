# Validation Summary: How to Use ST_Union() and ST_Intersection() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ spatial functions)
- SQL spatial/GIS operations
- Geometry types (Polygon, LineString, GeometryCollection)
- WKT (Well-Known Text) format

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Analysis Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-analysis-functions.html
- MySQL 8.0 Reference Manual: ST_Union — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html#function_st-union
- MySQL 8.0 Reference Manual: ST_Intersection — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html#function_st-intersection
- MySQL 8.0 Reference Manual: Spatial Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-aggregate-functions.html
- Manual geometric calculation to verify all area and length outputs

## Issues Found

### 1. Incorrect combined_coverage and overlap_area in delivery zones example (line 155)
**What was wrong:** The output showed `combined_coverage = 2900.00` and `overlap_area = 250.00`. The correct values are `2100.00` and `300.00`.
- Courier Alpha: POLYGON((0 0, 40 0, 40 30, 0 30, 0 0)) — area = 40 x 30 = 1200
- Courier Beta: POLYGON((20 15, 60 15, 60 45, 20 45, 20 15)) — area = 40 x 30 = 1200
- Overlap: x=[20,40] (width 20), y=[15,30] (height 15) — area = 300
- Union: 1200 + 1200 - 300 = 2100
**What was changed:** Corrected output to `2100.00` and `300.00`.

### 2. Incorrect overlap_pct in overlap percentage example (line 177)
**What was wrong:** The output showed `overlap_pct = 8.62`, which was derived from the incorrect values above. The correct value is `100 * 300 / 2100 = 14.29`.
**What was changed:** Corrected output to `14.29`.

### 3. Reference to non-existent ST_Collect function (line 235)
**What was wrong:** The Best Practices section recommended "Combine ST_Union with aggregation using ST_Collect to merge many geometries." MySQL does not have an `ST_Collect` function — that is a PostGIS function.
**What was changed:** Replaced with guidance to apply `ST_Union` iteratively or use a recursive CTE, noting that MySQL does not have a built-in spatial aggregate function.

## Review Notes
- All other code examples (basic union/intersection/difference, route clipping, disjoint geometry check) were verified and are correct.
- The SRID 0 usage throughout is appropriate for Cartesian coordinate examples. The post correctly notes in Best Practices that SRID 4326 requires matching SRIDs.
- The SQL syntax is valid MySQL 8.0+. These spatial functions were introduced in MySQL 5.7 but were significantly improved in 8.0.
- The ST_GeometryType return values shown as "Polygon" are correct for MySQL 8.0 (MySQL returns the type name without the "ST_" prefix).
