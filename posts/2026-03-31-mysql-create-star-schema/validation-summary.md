# Validation Summary: How to Create Star Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- Star schema / dimensional modeling
- SQL DDL (CREATE TABLE, ALTER TABLE)
- SQL DML (INSERT ... ON DUPLICATE KEY UPDATE)
- SQL analytical queries (JOIN, GROUP BY, aggregation functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: Data Types (BIGINT, SMALLINT, TINYINT, DECIMAL, VARCHAR, DATE, INT) — https://dev.mysql.com/doc/refman/8.0/en/data-types.html
- MySQL 8.0 Reference Manual: CREATE INDEX / ALTER TABLE ADD INDEX — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Reserved Words — https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL 8.0.20 Release Notes (VALUES() deprecation) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html

## Issues Found
1. **Deprecated `VALUES()` function in ON DUPLICATE KEY UPDATE**: The post used `VALUES(full_name)`, `VALUES(email)`, and `VALUES(segment)` in the UPDATE clause of the INSERT ... ON DUPLICATE KEY UPDATE statement. The `VALUES()` function in this context has been deprecated since MySQL 8.0.20 (April 2020) and is subject to removal in a future MySQL version. Replaced with the modern row alias syntax using `AS new_vals` and `new_vals.column_name` references.

## Review Notes
- The column names `year`, `quarter`, `month`, and `week` in `dim_date` are MySQL non-reserved keywords (function names). They work as identifiers without backtick quoting, but some teams prefer quoting them for clarity. This is a style preference, not an error.
- The covering index strategy (including `revenue` as the trailing column in composite indexes) is correctly explained and is a valid optimization technique.
- All data type choices are appropriate: BIGINT for surrogate keys, DECIMAL for monetary values, INT for date_key (common YYYYMMDD pattern), TINYINT/SMALLINT for calendar fields.
- The foreign key constraints on the fact table are correct and reference the proper primary keys on dimension tables.
