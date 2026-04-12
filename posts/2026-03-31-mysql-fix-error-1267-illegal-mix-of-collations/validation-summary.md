# Validation Summary: How to Fix ERROR 1267 Illegal Mix of Collations in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (ERROR 1267, collation system, character sets)
- MySQL information_schema (SCHEMATA, COLUMNS tables)
- MySQL DDL (ALTER TABLE, ALTER DATABASE)
- MySQL Connector/J (JDBC connection string parameters)
- mysql-connector-python (Python MySQL driver)

## Sources Consulted
- MySQL 8.0 Reference Manual — Character Sets, Collations, Unicode: https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual — Collation Coercibility in Expressions: https://dev.mysql.com/doc/refman/8.0/en/charset-collation-coercibility.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — ALTER DATABASE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-database.html
- MySQL 8.0 Reference Manual — CONVERT Function: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#function_convert
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA COLUMNS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA SCHEMATA Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html
- MySQL Connector/J 8.0 Developer Guide — Configuration Properties: https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html
- mysql-connector-python API Reference: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html

## Issues Found
No technical issues found.

## Review Notes
- The `CONVERT(x USING utf8mb4)` example works correctly for resolving collation conflicts even when both columns are already utf8mb4, because the resulting expressions both receive the default collation for the character set. However, using `COLLATE` directly (as shown in the first example of that section) is the more precise and explicit approach.
- The diagnostic query filters for `char`, `varchar`, `text`, `tinytext`, `mediumtext`, and `longtext` data types. The `enum` and `set` types also carry collation but are rarely the source of ERROR 1267 in practice, so this omission is reasonable.
- The JDBC `connectionCollation` parameter was introduced in MySQL Connector/J 8.0.26. Users on older connector versions would need to use alternative approaches. This version-specific caveat could be noted in a future update.
- The `useUnicode` parameter in the JDBC connection string is deprecated in recent Connector/J versions but still functional, so it remains a valid example.
