# Validation Summary: What Is a MySQL Table

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (general, covers syntax applicable to MySQL 5.7+ and 8.0+)
- InnoDB storage engine
- `information_schema` metadata views
- Online schema change tools (`pt-online-schema-change`, `gh-ost`)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html
- MySQL 8.0 Reference Manual: CREATE TEMPORARY TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-temporary-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: NOT NULL constraint — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: TRUNCATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html

## Issues Found

1. **"`NOT NULL` prevents empty values" was inaccurate** (line 30): Changed "prevents empty values" to "prevents NULL values". `NOT NULL` only prevents NULL — an empty string (`''`) is still allowed and is a distinct value from NULL in MySQL. The original phrasing could mislead readers into thinking empty strings are also rejected.

2. **Misleading comment on `CREATE TABLE ... AS SELECT`** (line 115): Changed the comment from "Copy structure and data" to "Copy column definitions and data (indexes and constraints are not copied)". The `CREATE TABLE ... AS SELECT` syntax does not copy indexes, PRIMARY KEY, UNIQUE constraints, FOREIGN KEY constraints, AUTO_INCREMENT attributes, or other table options. Only column definitions (names and types) and the data rows are copied. A reader relying on this for backups could end up with a table missing its primary key and indexes.

## Review Notes
- The `TINYINT(1)` display width notation is deprecated as of MySQL 8.0.17 but still functions. The post doesn't claim a specific MySQL version for this usage, so it's acceptable but worth noting for future updates.
- The `TABLE_ROWS` value from `information_schema.TABLES` is an estimate for InnoDB tables, not an exact count. The post's comment says "row count" which is technically what the column represents, but readers should be aware it may not be precise. This is a minor caveat, not an error.
- The `RENAME COLUMN` syntax is correctly noted as MySQL 8.0+ only.
- All SQL syntax is valid and would execute correctly in MySQL 5.7+ (or 8.0+ where noted).
