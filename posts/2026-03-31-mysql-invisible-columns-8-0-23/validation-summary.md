# Validation Summary: How to Use Invisible Columns in MySQL 8.0.23

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.23+
- SQL DDL (CREATE TABLE, ALTER TABLE)
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual — Invisible Columns: https://dev.mysql.com/doc/refman/8.0/en/invisible-columns.html
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — SHOW COLUMNS / DESCRIBE Statement: https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA COLUMNS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found
1. **Incorrect claim about DESCRIBE behavior**: The Limitations section stated "`DESCRIBE tablename` does not show invisible columns by default." This is incorrect. `DESCRIBE` (a synonym for `SHOW COLUMNS`) does show invisible columns — they appear in the output with `INVISIBLE` in the `Extra` field. Fixed the bullet point to accurately reflect this behavior.

## Review Notes
- All SQL syntax examples are correct and use valid MySQL 8.0.23+ syntax.
- The column attribute ordering in `ALTER TABLE products ADD COLUMN weight_kg DECIMAL(8,3) INVISIBLE DEFAULT 0` places `INVISIBLE` before `DEFAULT`. MySQL is flexible about attribute ordering, so this works correctly.
- The feature was indeed introduced in MySQL 8.0.23 (released January 2021) and remains current in later MySQL 8.x and 9.x releases.
