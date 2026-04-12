# Validation Summary: How to Convert a MySQL Database from utf8 to utf8mb4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (character sets, collations, InnoDB index limits)
- mysqldump (backup)
- MySQL Connector/J (JDBC connection strings)
- systemd (service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: ALTER DATABASE — https://dev.mysql.com/doc/refman/8.0/en/alter-database.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: innodb_large_prefix (removed) — https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_large_prefix
- MySQL 8.0 Reference Manual: innodb_file_format (removed) — https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_file_format
- MySQL Connector/J 8.0 Developer Guide: Configuration Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html
- MySQL 8.0 Reference Manual: information_schema tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html

## Issues Found
1. **JDBC connection string used invalid `characterEncoding` value**: The post specified `characterEncoding=utf8mb4` in the JDBC connection string. The `characterEncoding` parameter expects a Java charset name, not a MySQL charset name. `utf8mb4` is not a valid Java charset. Changed to `characterEncoding=UTF-8`, which in MySQL Connector/J 8.0+ correctly maps to MySQL's `utf8mb4` on the server side.

2. **`innodb_large_prefix` and `innodb_file_format` presented without version context**: The post recommended `SET GLOBAL innodb_large_prefix = ON` and `SET GLOBAL innodb_file_format = Barracuda` without noting that these system variables were deprecated in MySQL 5.7.7 and removed entirely in MySQL 8.0. Running these on MySQL 8.0+ produces an "Unknown system variable" error. Added a note clarifying these are only applicable to MySQL 5.6/5.7, and that MySQL 8.0+ always enables the 3072-byte index prefix limit by default.

## Review Notes
- The post correctly identifies the core issue with MySQL's `utf8` charset (3-byte limitation) and provides a solid step-by-step migration guide.
- All SQL queries against `information_schema` are syntactically correct and use the right column/table names.
- The `mysqldump` command with `--single-transaction` is appropriate for InnoDB tables.
- The server configuration in `my.cnf` is correct and complete.
- The `utf8mb4_unicode_ci` collation used throughout is a reasonable default choice. For MySQL 8.0+, `utf8mb4_0900_ai_ci` is the new default collation, but `utf8mb4_unicode_ci` remains valid and widely used.
- The 767-byte index key limit explanation and the VARCHAR(191) workaround (191 * 4 = 764 bytes) are mathematically correct.
