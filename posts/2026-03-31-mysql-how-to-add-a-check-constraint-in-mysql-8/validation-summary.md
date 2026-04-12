# Validation Summary: How to Add a CHECK Constraint in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.16+
- SQL DDL (ALTER TABLE, CREATE TABLE)
- CHECK constraints
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual — Section 13.1.20.6 CHECK Constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html)
- MySQL 8.0 Reference Manual — ALTER TABLE syntax (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA CHECK_CONSTRAINTS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-check-constraints-table.html)

## Issues Found
- **Misleading limitation about functions in CHECK expressions**: The post stated "Functions with side effects (e.g., stored functions that modify data) are not allowed." This implied only stored functions that modify data are disallowed. In reality, ALL stored functions and user-defined functions are prohibited in CHECK expressions, regardless of side effects. Additionally, non-deterministic built-in functions (e.g., `NOW()`, `RAND()`) are also not allowed — only literals, deterministic built-in functions, and operators are permitted. Fixed the limitation entry to accurately reflect the MySQL documentation.

## Review Notes
- All SQL syntax examples are correct and would execute successfully on MySQL 8.0.16+.
- The version-specific claims are accurate: CHECK enforcement in 8.0.16, DROP CONSTRAINT in 8.0.19.
- The NOT ENFORCED / ENFORCED syntax and default behavior are correctly described.
- The advice to check existing data before adding a constraint is sound — MySQL will reject the ALTER TABLE if any existing row violates the condition.
- The INFORMATION_SCHEMA query correctly uses CHECK_CONSTRAINTS with CONSTRAINT_SCHEMA = DATABASE().
