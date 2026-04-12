# Validation Summary: How to Use FLOAT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (FLOAT data type, single-precision floating-point)
- IEEE 754 floating-point representation
- SQL DDL (CREATE TABLE) and DML (INSERT, SELECT)
- MySQL aggregate functions (AVG, MIN, MAX, ROUND)

## Sources Consulted
- MySQL 8.0 Reference Manual — Numeric Data Type Syntax: https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html
- MySQL 8.0 Reference Manual — Floating-Point Types: https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html
- MySQL 8.0 Reference Manual — Problems with Floating-Point Values: https://dev.mysql.com/doc/refman/8.0/en/problems-with-float.html
- IEEE 754-2008 Standard for Floating-Point Arithmetic (single-precision: 4 bytes, 24-bit significand, ~7.22 decimal digits)
- MySQL 8.0.17 Release Notes (deprecation of FLOAT(M,D) syntax)

## Issues Found
No technical issues found.

## Review Notes
- The floating-point imprecision example output (`0.30000001192092896`) reflects the internal single-precision representation accurately. In MySQL 8.0.17+, the display format changed to show the minimum digits needed to distinguish the value, so users on newer versions may see slightly different output (e.g., `0.3`). The concept illustrated is correct regardless of version.
- The GPS latitude/longitude example using FLOAT provides ~7 significant digits, which gives approximately 11-meter precision for longitudes near ±180. This is adequate for general telemetry but may not suffice for applications requiring sub-meter accuracy. The post's framing as a telemetry use case makes this appropriate.
- In MySQL 8.4, the `FLOAT(p)` syntax itself is also deprecated (not just `FLOAT(M,D)`). The post's claim about 8.0.17 is correct for the versions it covers.
- The MySQL documentation has a known inconsistency between the numeric-type-syntax page (0-24 → FLOAT, 25-53 → DOUBLE) and the floating-point-types page (0-23 → FLOAT, 24-53 → DOUBLE). The post follows the numeric-type-syntax page, which is the more commonly referenced source.
