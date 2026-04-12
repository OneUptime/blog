# Validation Summary: How to Use SHOW WARNINGS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SHOW WARNINGS, SHOW ERRORS, SHOW COUNT(*) WARNINGS)
- MySQL sql_mode (STRICT_ALL_TABLES, STRICT_TRANS_TABLES)
- MySQL CLI client (\W and \w commands)
- Python (mysql.connector)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW WARNINGS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-warnings.html
- MySQL 8.0 Reference Manual: Server Error Message Reference — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual: EXPLAIN Output (Extended EXPLAIN) — https://dev.mysql.com/doc/refman/8.0/en/explain-extended.html
- MySQL Connector/Python Developer Guide — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **ALTER TABLE example showed wrong warning Level**: The output table displayed `Note` as the Level for error code 1265 (data truncated). Code 1265 is a data truncation diagnostic which MySQL reports at the `Warning` level, not `Note`. Notes are reserved for informational messages (e.g., optimizer query rewrites with code 1003). Changed `Note` to `Warning` in the output and updated the section intro text from "notes" to "warnings".

2. **Unused import in Python example**: The `import warnings` line (Python standard library) was included but never used in the code. The example only uses `mysql.connector` to issue `SHOW WARNINGS` as a SQL query. Removed the dead import.

## Review Notes
- The INSERT truncation and data type conversion examples only produce warnings in non-strict SQL mode. Since MySQL 5.7+, the default sql_mode includes STRICT_TRANS_TABLES, which would cause those INSERTs to fail with errors instead. The post does cover strict mode in a later section, so this is implicitly addressed, but readers running MySQL 5.7+ with defaults may not reproduce the warning examples without first running `SET sql_mode = '';`.
- The common warning codes table is accurate. Code 1062 (duplicate entry) is correctly noted as escalating to an error.
- The EXPLAIN + SHOW WARNINGS section correctly identifies code 1003 as the optimizer note showing the rewritten query.
