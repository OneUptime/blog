# Validation Summary: How to Use DECIMAL and NUMERIC Data Types in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL DECIMAL and NUMERIC data types
- SQL DDL (CREATE TABLE) and DML (INSERT, SELECT)
- Fixed-point vs floating-point arithmetic
- MySQL storage internals for DECIMAL

## Sources Consulted
- MySQL 8.0 Reference Manual: Precision Math — https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual: Fixed-Point Types (Exact Value) — https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html
- MySQL 8.0 Reference Manual: Numeric Type Attributes (UNSIGNED deprecation) — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html
- MySQL 8.0 Reference Manual: Precision Math Expressions — https://dev.mysql.com/doc/refman/8.0/en/precision-math-expressions.html

## Issues Found

1. **Incorrect storage description (line 13):** The post stated DECIMAL values are "stored as a string-like representation internally." This was true for very old MySQL versions but not since MySQL 5.0.3+. MySQL stores DECIMAL in a compact binary format that packs nine decimal digits into four bytes. Fixed to "stored in a compact binary format that packs nine decimal digits into four bytes."

2. **Incorrect FLOAT comparison example (lines 106-107):** The original code `SELECT 0.1 + 0.2` was claimed to return `0.30000000000000004`. In MySQL, numeric literals with decimal points are treated as exact-value DECIMAL, not FLOAT, so `SELECT 0.1 + 0.2` actually returns `0.3`. Fixed by using `CAST(0.1 AS DOUBLE) + CAST(0.2 AS DOUBLE)` to demonstrate floating-point imprecision, and changed the exact-value example to show that bare literals are already DECIMAL by default.

3. **Incorrect overflow example (lines 144-146):** The post claimed `99999999.99` exceeds `DECIMAL(10,2)` with the comment "10 digits before decimal." In reality, `99999999.99` has 8 integer digits + 2 fractional digits = 10 total digits, which fits exactly in `DECIMAL(10,2)`. This is actually the maximum valid value. Changed to `999999999.99` (9 integer digits) which genuinely exceeds the 8-integer-digit limit and would produce the shown error.

4. **Missing UNSIGNED deprecation notice (line 117-120):** The `UNSIGNED` attribute for `DECIMAL`/`NUMERIC` was deprecated in MySQL 8.0.17. Added a note recommending `CHECK` constraints as the modern alternative.

## Review Notes
- The UNSIGNED attribute also appears in the Syntax section. While technically still functional, users targeting MySQL 8.0.17+ should be aware of the deprecation. The note added to the UNSIGNED section covers this.
- The arithmetic results in the Exact Arithmetic section were manually verified and are all correct.
- The storage calculation for DECIMAL(10,2) = 5 bytes is correct (8 integer digits = 4 bytes, 2 fractional digits = 1 byte).
- The financial ledger balance calculations are correct.
