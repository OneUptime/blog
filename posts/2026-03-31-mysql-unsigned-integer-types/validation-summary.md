# Validation Summary: How to Use UNSIGNED Integer Types in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (integer types, UNSIGNED attribute, AUTO_INCREMENT, foreign keys, CHECK constraints)
- SQL (DDL, DML, CAST, arithmetic)

## Sources Consulted
- MySQL 8.0 Reference Manual: Numeric Data Types — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html
- MySQL 8.0 Reference Manual: Integer Types — https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual: Out-of-Range and Overflow Handling — https://dev.mysql.com/doc/refman/8.0/en/out-of-range-and-overflow.html
- MySQL 8.0 Reference Manual: Server SQL Modes (NO_UNSIGNED_SUBTRACTION) — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Release Notes (8.0.17 deprecation of UNSIGNED for FLOAT/DOUBLE/DECIMAL) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html

## Issues Found

1. **UNSIGNED for DECIMAL and FLOAT deprecated (MySQL 8.0.17+)**: The post recommended using `UNSIGNED` on `DECIMAL` and `FLOAT` columns without mentioning that this usage is deprecated as of MySQL 8.0.17. Added a deprecation notice, showed both the deprecated syntax and the recommended `CHECK` constraint approach, and updated the best practices bullet accordingly.

2. **Incorrect strict mode attribution in "Preventing Negative Values" section**: The comments stated "Strict mode prevents going below 0" and "in strict mode this raises an error." The ERROR 1690 for unsigned arithmetic underflow is caused by the unsigned subtraction producing an out-of-range result, not by strict SQL mode. Fixed comments to accurately describe the cause.

3. **Incorrect strict mode attribution in "Arithmetic and UNSIGNED Overflow" section**: The comments stated "In strict mode: ERROR" and "Without strict mode: wraps to a large unsigned number." The behavior of unsigned subtraction in SELECT expressions is controlled by the `NO_UNSIGNED_SUBTRACTION` SQL mode, not strict mode. Without it, an error is raised; with it, a signed result is returned. Fixed comments to reference `NO_UNSIGNED_SUBTRACTION` correctly.

## Review Notes
- The integer range table uses scientific notation approximations for BIGINT (e.g., "9.2 * 10^18"). These are reasonable approximations but not exact values. This is acceptable for readability.
- The `UNSIGNED` attribute for integer types (TINYINT, SMALLINT, MEDIUMINT, INT, BIGINT) remains fully supported and is not deprecated — only FLOAT/DOUBLE/DECIMAL UNSIGNED is deprecated.
- All SQL code examples are syntactically correct and would execute successfully on MySQL 8.0.
- The output examples (query results) are mathematically correct and match what MySQL would produce.
