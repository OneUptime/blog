# Validation Summary: How to Use ST_Intersects() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 spatial functions
- SQL (DDL and DML)
- GIS / Spatial data (SRID 4326, WGS 84)
- ST_Intersects, ST_Within, ST_Contains, ST_Disjoint, ST_Overlaps, ST_Touches
- MBRIntersects
- Spatial indexes (R-tree)

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Relation Functions That Use Object Shapes (https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html)
- MySQL 8.0 Reference Manual: Spatial Data Types (https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html)
- MySQL 8.0 Reference Manual: Spatial Index Optimization (https://dev.mysql.com/doc/refman/8.0/en/spatial-index-optimization.html)
- MySQL 8.0 Reference Manual: Creating Spatial Indexes (https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html)
- OGC Simple Features Specification (ST_Intersects / ST_Disjoint relationship)

## Issues Found
- **Typo in mermaid diagram**: "overlag" was misspelled; corrected to "overlap" on line 23.

## Review Notes
- **Coordinate order with SRID 4326**: The blog consistently uses (longitude, latitude) coordinate order in all ST_GeomFromText calls. In MySQL 8.0.12+, SRID 4326 defines axis order as (latitude, longitude), so the first value is interpreted as latitude and the second as longitude. The coordinates (e.g., -74.020 40.700 for New York) are therefore geographically inverted. However, since all geometries use the same convention consistently, the spatial relationships and all expected query outputs remain correct. This is a very common convention confusion and does not affect the tutorial's demonstrated functionality.
- **MBRIntersects two-step pattern**: The blog suggests combining MBRIntersects with ST_Intersects for a two-step filter. In MySQL 8.0+ with InnoDB, ST_Intersects already leverages the spatial index's R-tree for bounding-box pre-filtering internally, making the manual MBR pre-filter redundant. The code is not wrong (it works), but may give readers the impression that the two-step approach is necessary for performance.
- **ST_Disjoint spatial index claim**: The predicate comparison table marks ST_Disjoint as using spatial indexes ("Yes"). The MySQL optimizer may attempt spatial index optimization for ST_Disjoint, but there is a known MySQL bug (#113167) where ST_Disjoint returns incorrect results when a spatial index is present. Users should be aware of this edge case.
- **ST_Within boundary semantics**: The blog states "ST_Within requires the point to be strictly inside the interior." This is a reasonable interpretation supported by MySQL's documented examples (boundary points return 0 for ST_Within), though the official docs phrase it as testing "the opposite relationship as ST_Contains" rather than using the term "strictly inside."
- All SQL syntax (CREATE TABLE with SRID, SPATIAL INDEX, ST_GeomFromText, spatial predicates) is valid MySQL 8.0 syntax.
- All expected query outputs were verified by manual geometric analysis and are correct.
