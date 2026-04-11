# Validation Summary: How to Use ST_Difference() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_Difference() geometry function
- ST_Area(), ST_AsText(), ST_GeomFromText() helper functions
- ST_Union(), ST_Intersection() (mentioned for context)
- ST_Transform() (mentioned for SRID conversion)
- Spatial indexes in MySQL

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Relation Functions That Generate New Geometries — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html
- MySQL 8.0 Reference Manual: CREATE TABLE Spatial Index syntax — https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html
- MySQL 8.0 Reference Manual: Spatial Data Types — https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html
- OGC Simple Feature Access specification for set-theoretic spatial operations

## Issues Found
No technical issues found.

## Review Notes
- The section heading "Symmetry with ST_Union and ST_Intersection" could be read as implying ST_Difference is symmetric (commutative), which it is not — ST_Difference(g1, g2) != ST_Difference(g2, g1). The body text is accurate, but a heading like "Relationship with ST_Union and ST_Intersection" would be clearer. Not changed since this is a stylistic observation, not a technical error.
- All SQL examples use SRID 0 (Cartesian plane), which is appropriate for introductory examples. Production use would typically involve SRID 4326 (WGS 84) or other geographic coordinate systems.
- The POLYGON NOT NULL SRID 0 column constraint syntax requires MySQL 8.0.13+. This version requirement is not mentioned in the post but is unlikely to cause issues given MySQL 8.0's maturity.
