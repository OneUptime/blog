# Validation Summary: How to Fix 'Data Too Long for Column' Errors in MySQL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- MySQL
- SQL
- MySQL SQL modes
- MySQL string, TEXT, BLOB, and JSON data types
- MySQL Connector/Python
- JavaScript / Node.js database query patterns
- Percona Toolkit pt-online-schema-change

## Sources Consulted
- MySQL 8.0 Reference Manual: Server SQL Modes - https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 5.7 Reference Manual: Server SQL Modes - https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html
- MySQL 8.4 Reference Manual: sys.list_drop() / list_add() functions - https://dev.mysql.com/doc/refman/8.4/en/sys-list-add.html
- MySQL Reference Manual: Data Type Storage Requirements - https://dev.mysql.com/doc/en/storage-requirements.html
- MySQL 8.0 Reference Manual: String Data Type Syntax - https://dev.mysql.com/doc/refman/8.0/en/string-type-syntax.html
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types - https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL Reference Manual: String Functions and Operators - https://dev.mysql.com/doc/en/string-functions.html
- MySQL 8.0 Reference Manual: CHECK Constraints - https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL Server Error Message Reference: ER_DATA_TOO_LONG - https://dev.mysql.com/doc/mysql-errors/8.2/en/server-error-reference.html
- MySQL Connector/Python Developer Guide: errors.Error Exception - https://dev.mysql.com/doc/connector-python/en/connector-python-api-errors-error.html
- Percona Toolkit Documentation: pt-online-schema-change - https://docs.percona.com/percona-toolkit/pt-online-schema-change.html
- RFC 5321: Simple Mail Transfer Protocol - https://datatracker.ietf.org/doc/html/rfc5321

## Issues Found
- The SQL mode example only removed `STRICT_TRANS_TABLES`, but MySQL strict mode can also be enabled by `STRICT_ALL_TABLES`. Updated the snippet to use `sys.list_drop()` and remove both strict modes.
- The data type recommendation described `TEXT` as suitable for "unlimited user input", but MySQL `TEXT` is limited to 65,535 bytes. Updated the comment to state that limit.
- The CHECK constraint section said "MySQL 8.0+", but MySQL parsed and ignored CHECK constraints before 8.0.16. Updated the heading to "MySQL 8.0.16+".
- The `pt-online-schema-change` example omitted `--execute`; Percona Toolkit does not modify the table unless `--execute` is specified. Added `--execute` to the example command.

## Review Notes
The remaining examples are illustrative snippets and assume existing `cursor`, `connection`, and `db` objects in the surrounding application code. The MySQL length, storage, SQL mode, and error-code explanations match the official documentation reviewed.
