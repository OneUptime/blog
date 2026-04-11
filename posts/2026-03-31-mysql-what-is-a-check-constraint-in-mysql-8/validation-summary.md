# Validation Summary: What Is a CHECK Constraint in MySQL 8

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0.16+
- SQL DDL (CREATE TABLE, ALTER TABLE)
- INFORMATION_SCHEMA system tables
- CHECK constraints

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE and CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA CHECK_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-check-constraints-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLE_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html

## Issues Found
1. **Incorrect INFORMATION_SCHEMA query in "Viewing CHECK Constraints" section**: The original query selected `TABLE_NAME` and `ENFORCED` directly from `INFORMATION_SCHEMA.CHECK_CONSTRAINTS`, but that table only has four columns: `CONSTRAINT_CATALOG`, `CONSTRAINT_SCHEMA`, `CONSTRAINT_NAME`, and `CHECK_CLAUSE`. The `TABLE_NAME` column and `ENFORCED` column exist in `INFORMATION_SCHEMA.TABLE_CONSTRAINTS`. Fixed by rewriting the query to JOIN `CHECK_CONSTRAINTS` with `TABLE_CONSTRAINTS` on the shared `CONSTRAINT_SCHEMA` and `CONSTRAINT_NAME` columns, filtering by `TABLE_NAME` and `CONSTRAINT_TYPE = 'CHECK'` from the `TABLE_CONSTRAINTS` table.

## Review Notes
- The sample output table under the query shows constraint names (`chk_price_positive`, `chk_stock_nonneg`) that don't match the unnamed column-level constraints defined in the "Basic Syntax" section (which would auto-generate names like `products_chk_1`, `products_chk_2`). This is a minor presentational inconsistency — the output is illustrative rather than a direct continuation of the earlier example — so it was left as-is.
- All SQL syntax (CREATE TABLE, ALTER TABLE ADD/DROP/ALTER CHECK, NOT ENFORCED) is correct for MySQL 8.0.16+.
- The error code 3819 (HY000) for CHECK constraint violations is accurate.
- The claim that CHECK constraints were parsed but ignored prior to 8.0.16 is historically correct.
- The list of disallowed expressions (subqueries, stored functions, references to other tables) is accurate per the MySQL documentation.
