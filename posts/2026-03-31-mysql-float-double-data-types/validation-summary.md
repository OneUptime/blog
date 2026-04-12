# Validation Summary: How to Use FLOAT and DOUBLE Data Types in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL, DML, floating-point arithmetic)
- IEEE 754 floating-point standard

## Sources Consulted
- MySQL 8.0 Reference Manual — Floating-Point Types: https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html
- MySQL 8.0 Reference Manual — Precision Math: https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual — Numeric Type Attributes (UNSIGNED deprecation): https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html
- MySQL 8.0.17 Release Notes (deprecation of FLOAT(M,D), DOUBLE(M,D), and UNSIGNED for floating-point types)
- IEEE 754 standard for floating-point arithmetic (precision and range values)

## Issues Found

### 1. Incorrect `SELECT 0.1 + 0.2` example (The Imprecision Problem section)
- **What was wrong:** The post used `SELECT 0.1 + 0.2;` and claimed the result is `0.30000000000000004`. In MySQL, bare numeric literals like `0.1` are treated as exact-value DECIMAL types, not DOUBLE. So `SELECT 0.1 + 0.2;` actually returns `0.3` exactly.
- **What was changed:** Changed to `SELECT 0.1E0 + 0.2E0;` with an explanatory comment. The `E0` suffix forces MySQL to evaluate the literals as DOUBLE (floating-point), which correctly produces the imprecision result.
- **Why:** Without this fix, readers would get `0.3` when running the example and be confused by the discrepancy with the post's claimed output.

### 2. Deprecation note too broad for FLOAT/DOUBLE precision syntax (Syntax section)
- **What was wrong:** The post stated "In MySQL 8.0, specifying precision in parentheses for FLOAT or DOUBLE is deprecated." This conflates two different syntaxes: `FLOAT(p)` (single parameter, bit-precision — NOT deprecated) and `FLOAT(M,D)` / `DOUBLE(M,D)` (display width — deprecated in 8.0.17).
- **What was changed:** Clarified that only the non-standard `FLOAT(M,D)` and `DOUBLE(M,D)` syntax is deprecated, while the standard `FLOAT(p)` bit-precision syntax remains valid. Updated version reference to 8.0.17+.
- **Why:** The standard SQL `FLOAT(p)` syntax is still valid and useful — telling readers it's deprecated would discourage a legitimate feature.

### 3. UNSIGNED FLOAT/DOUBLE section missing deprecation notice
- **What was wrong:** The "UNSIGNED FLOAT and DOUBLE" section demonstrated `FLOAT UNSIGNED` and `DOUBLE UNSIGNED` without mentioning that the `UNSIGNED` attribute for floating-point types is deprecated as of MySQL 8.0.17.
- **What was changed:** Added a deprecation notice and a preferred alternative using `CHECK` constraints, as recommended by the MySQL documentation.
- **Why:** Readers following this example would get deprecation warnings in MySQL 8.0.17+. The preferred approach using CHECK constraints should be shown.

## Review Notes
- The `REAL` type is described as an alias for `DOUBLE`, which is correct for the default SQL mode. If `REAL_AS_FLOAT` SQL mode is enabled, `REAL` maps to `FLOAT` instead. This edge case is not mentioned but is minor enough not to require a fix.
- All SQL CREATE TABLE and INSERT statements are syntactically correct and would execute successfully.
- The GPS coordinate values used in examples correspond to real locations (Eiffel Tower, Statue of Liberty, Sydney Opera House), which is a nice touch for realism.
- The advice about avoiding equality comparisons with floating-point values is accurate and well-presented.
- The decision flowchart (FLOAT vs DOUBLE vs DECIMAL) is technically sound.
