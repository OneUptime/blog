# Validation Summary: What Is a Collation in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0+
- MySQL collation system (utf8mb4_general_ci, utf8mb4_unicode_ci, utf8mb4_0900_ai_ci, utf8mb4_0900_as_cs, utf8mb4_bin)
- MySQL character sets (utf8mb4)
- MySQL information_schema
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets, Collations, Unicode — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: Collation Naming Conventions — https://dev.mysql.com/doc/refman/8.0/en/charset-collation-names.html
- MySQL 8.0 Reference Manual: Server Character Set and Collation — https://dev.mysql.com/doc/refman/8.0/en/charset-server.html
- MySQL 8.0 Reference Manual: SHOW COLLATION Statement — https://dev.mysql.com/doc/refman/8.0/en/show-collation.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and uses current MySQL 8.0 conventions.
- The collation properties table accurately describes case sensitivity and accent sensitivity for each listed collation.
- The naming convention explanation correctly maps the `0900` in `utf8mb4_0900_ai_ci` to Unicode Collation Algorithm version 9.0.0.
- The collation hierarchy (server > database > table > column) is correctly described.
- The binary sorting explanation (uppercase before lowercase due to byte values) is accurate.
- ERROR 1267 is the correct error code for illegal mix of collations.
- The `collation_server` system variable is the correct variable name for server-level configuration.
- The post is relevant to MySQL 8.0+. Users on MySQL 5.7 or earlier should note that `utf8mb4_general_ci` was the default collation for `utf8mb4` in those versions, and `utf8mb4_0900_ai_ci` was not available before 8.0.
