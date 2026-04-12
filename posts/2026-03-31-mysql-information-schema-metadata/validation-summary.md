# Validation Summary: How to Use INFORMATION_SCHEMA in MySQL for Metadata Queries

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7+, 8.0+)
- SQL
- INFORMATION_SCHEMA virtual database
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA REFERENTIAL_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-referential-constraints-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: The performance_schema.processlist Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-processlist-table.html
- MySQL 8.0 Reference Manual: MySQL Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html

## Issues Found
1. **Misleading best practice about performance_schema**: The original text stated "For performance-sensitive metadata queries on MySQL 8.0+, use the `performance_schema` instead, which has lower query overhead." This is misleading because `performance_schema` is designed for performance monitoring (threads, events, stages, memory), not schema metadata queries. It does not contain equivalents of TABLES, COLUMNS, STATISTICS, KEY_COLUMN_USAGE, etc. In MySQL 8.0+, `INFORMATION_SCHEMA` was actually improved by reading directly from the InnoDB data dictionary, making it faster than in previous versions. The one specific case where `performance_schema` is a faster alternative is for process list queries (`performance_schema.processlist`, available since MySQL 8.0.22). Fixed the bullet point to accurately reflect this distinction.

## Review Notes
- All SQL queries are syntactically correct and use valid INFORMATION_SCHEMA column names.
- The setup DDL (`DEFAULT NOW()` for DATETIME) is valid in MySQL 5.7+ where NOW() is accepted as a synonym for CURRENT_TIMESTAMP in column defaults.
- The JOIN between KEY_COLUMN_USAGE and REFERENTIAL_CONSTRAINTS correctly uses CONSTRAINT_NAME and CONSTRAINT_SCHEMA, which are unique per schema in MySQL.
- The note about TABLE_ROWS being an estimate for InnoDB is correct and important — this is a common pitfall.
- The INNODB_BUFFER_PAGE table listed in the views summary is still available in INFORMATION_SCHEMA in MySQL 8.0, though InnoDB-specific INFORMATION_SCHEMA tables are deprecated in favor of Performance Schema equivalents in newer versions.
