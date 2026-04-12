# Validation Summary: How to Use CHECK Constraints in MySQL 8.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.16+
- SQL DDL (CREATE TABLE, ALTER TABLE)
- CHECK constraints
- information_schema views (CHECK_CONSTRAINTS, TABLE_CONSTRAINTS)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE and CHECK constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: information_schema.CHECK_CONSTRAINTS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-check-constraints-table.html
- MySQL 8.0 Reference Manual: information_schema.TABLE_CONSTRAINTS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0.16 Release Notes (CHECK constraint enforcement) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html

## Issues Found
1. **Incorrect column reference in information_schema query**: The "Viewing CHECK Constraints" section queried `ENFORCED` directly from `information_schema.CHECK_CONSTRAINTS`. The `ENFORCED` column does not exist in the `CHECK_CONSTRAINTS` table — it is only available in `information_schema.TABLE_CONSTRAINTS`. The query would fail with `ERROR 1054 (42S22): Unknown column 'ENFORCED' in 'field list'`. Fixed by joining `CHECK_CONSTRAINTS` with `TABLE_CONSTRAINTS` on `CONSTRAINT_SCHEMA` and `CONSTRAINT_NAME` to retrieve the `ENFORCED` value correctly.

## Review Notes
- The recommendation to "Prefer ENUM over CHECK (col IN (...)) for fixed string-value columns" is debatable. ENUM has known drawbacks (requires DDL changes to add values, non-intuitive sort order based on internal index, portability issues). However, this is a stylistic recommendation rather than a technical error, so it was left unchanged.
- All SQL syntax, error codes (3819 / HY000), NULL behavior explanation, NOT ENFORCED syntax, ALTER TABLE ADD/DROP CONSTRAINT syntax, and data type usage are technically correct.
- The post correctly notes that CHECK constraints were parsed but silently ignored before MySQL 8.0.16.
