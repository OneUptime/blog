# Validation Summary: How to Use Data Dictionary in MySQL 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- MySQL Data Dictionary
- INFORMATION_SCHEMA views
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: The Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html
- MySQL 8.0 Reference Manual: Data Dictionary Tables (hidden) — https://dev.mysql.com/doc/refman/8.0/en/system-schema.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA VIEWS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html

## Issues Found
1. **Incorrect claim about verifying hidden data dictionary tables via INFORMATION_SCHEMA** (lines 103-113): The post included a SQL query suggesting you can verify the existence of underlying data dictionary tables (`tables`, `columns`, `indexes`, `routines`) in the `mysql` schema by querying `INFORMATION_SCHEMA.TABLES`. This is incorrect — in MySQL 8.0, these data dictionary tables are hidden and are NOT visible through `INFORMATION_SCHEMA` queries or `SHOW TABLES`. The query would return no results. Replaced the incorrect query and surrounding text with an accurate explanation that these tables exist but are hidden, and that `INFORMATION_SCHEMA` views are the only supported access method.

## Review Notes
- All other SQL queries (INFORMATION_SCHEMA.TABLES, COLUMNS, STATISTICS, ROUTINES, KEY_COLUMN_USAGE, VIEWS) use correct column names and valid syntax.
- The SHOW statement examples are all valid MySQL syntax.
- The foreign key query's JOIN condition (on CONSTRAINT_NAME + TABLE_SCHEMA) is correct since constraint names are unique within a schema in MySQL.
- The auditing query's use of COALESCE for UPDATE_TIME (which can be NULL) is appropriate.
- The historical claims about `.frm`, `.par`, and `.opt` files in MySQL 5.7 and earlier are accurate.
