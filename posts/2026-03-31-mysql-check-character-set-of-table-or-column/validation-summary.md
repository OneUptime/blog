# Validation Summary: How to Check the Character Set of a Table or Column in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW commands, information_schema views)
- SQL (SELECT, LIKE, SHOW VARIABLES)
- MySQL Character Sets and Collations (utf8, utf8mb4)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/show-create-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA SCHEMATA Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html
- MySQL 8.0 Reference Manual: SHOW FULL COLUMNS — https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
- MySQL 8.0 Reference Manual: Server System Variables (character_set_*, collation_*) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: The utf8mb3 Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb3.html

## Issues Found
No technical issues found.

## Review Notes
- In MySQL 8.0.28+, the legacy 3-byte UTF-8 character set is displayed as `utf8mb3` rather than `utf8` in information_schema views. This means the queries in the "Find Tables or Columns Using a Specific Character Set" section (`CHARACTER_SET_NAME = 'utf8'` and `TABLE_COLLATION LIKE 'utf8\_%'`) may need to be adjusted to `utf8mb3` on newer MySQL versions. The post's queries are correct for pre-8.0.28 versions and the concept is sound regardless of version, so this is noted as a version-specific caveat rather than an error.
- The example uses `utf8mb4_unicode_ci` as the collation, which is valid but not the default collation for utf8mb4 in MySQL 8.0+ (the default changed to `utf8mb4_0900_ai_ci` in MySQL 8.0.1). This is fine since it's just an example and doesn't claim to be the default.
- All SQL syntax, information_schema column names, and system variable names verified as correct.
