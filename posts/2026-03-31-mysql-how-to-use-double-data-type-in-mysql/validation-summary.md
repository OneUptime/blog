# Validation Summary: How to Use DOUBLE Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (DOUBLE data type, floating-point storage, IEEE 754 double-precision)
- SQL DDL and DML (CREATE TABLE, INSERT, SELECT)
- MySQL numeric types comparison (FLOAT, DOUBLE, DECIMAL)

## Sources Consulted
- MySQL 8.0 Reference Manual: Floating-Point Types (https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html)
- MySQL 8.0 Reference Manual: Numeric Data Type Syntax (https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html)
- MySQL 8.0 Reference Manual: Spatial Indexes (https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html)
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- IEEE 754 double-precision floating-point specification

## Issues Found
1. **Invalid SPATIAL INDEX on DOUBLE columns**: The `locations` table included `SPATIAL INDEX USING HASH (latitude, longitude)` which is incorrect for multiple reasons:
   - MySQL SPATIAL INDEX requires columns of spatial data types (POINT, GEOMETRY, LINESTRING, POLYGON, etc.), not DOUBLE columns. Attempting to create a spatial index on DOUBLE columns would produce an error.
   - SPATIAL INDEX in MySQL uses R-tree internally; `USING HASH` is not valid syntax for spatial indexes.
   - **Fix**: Replaced with `INDEX idx_coords (latitude, longitude)`, which is a standard composite B-tree index appropriate for DOUBLE coordinate columns.

## Review Notes
- The example output for `dbl_val` shows `3.1415926535897932` (17 significant digits). MySQL 8.0.17+ uses a shortest-representation algorithm and would display `3.141592653589793` (16 significant digits). Earlier versions displayed a fixed number of digits. The trailing `2` is slightly inaccurate for any version (the 17th significant digit of the stored IEEE 754 value is `1`, not `2`). This is cosmetic and does not affect the post's correctness since it is labeled "Example output" and the key point about DOUBLE having ~15-16 digits of precision is accurate.
- The FLOAT(p) alias documentation (p = 25-53 maps to DOUBLE) is correct per MySQL docs but this syntax is deprecated as of MySQL 8.0.17 and may be removed in a future version. The post could note this in a future update.
- All SQL syntax, technical explanations, and guidance (e.g., avoiding equality comparisons, using DECIMAL for financial data) are accurate and well-presented.
