# Validation Summary: How to Query INFORMATION_SCHEMA.COLLATIONS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- INFORMATION_SCHEMA.COLLATIONS
- INFORMATION_SCHEMA.COLUMNS
- Character sets and collations (utf8mb4)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLLATIONS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-collations-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: Collation Naming Conventions — https://dev.mysql.com/doc/refman/8.0/en/charset-collation-names.html
- MySQL 8.0 Reference Manual: The PAD_ATTRIBUTE Column — https://dev.mysql.com/doc/refman/8.0/en/information-schema-collations-table.html

## Issues Found
No technical issues found.

## Review Notes
- The post recommends `utf8mb4_unicode_ci` for new tables. While this is a valid and widely-used collation, MySQL 8.0 changed the default collation for utf8mb4 to `utf8mb4_0900_ai_ci`, which is based on Unicode 9.0 and is generally faster. This is not an error — `utf8mb4_unicode_ci` works correctly — but readers targeting MySQL 8.0+ may prefer the newer default.
- All seven column names listed match the official MySQL 8.0 documentation for INFORMATION_SCHEMA.COLLATIONS.
- All SQL queries are syntactically correct and would execute successfully on a MySQL 8.0+ server.
- The PAD SPACE vs NO PAD explanation is accurate and correctly noted as MySQL 8.0+ specific.
- The collation naming convention explanation (_ci, _cs, _bin suffixes) is accurate.
