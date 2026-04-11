# Validation Summary: How to Choose Between Stored Procedures and Application Logic in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (stored procedures, DELIMITER, ROW_COUNT(), date arithmetic)
- Python (DB-API 2.0, `callproc`, mysql-connector-python / PyMySQL)
- JavaScript / Node.js (mysql2 `pool.execute`)
- Flyway and Liquibase (database migration tools)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — Date and Time Functions (INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- PEP 249 — Python DB-API 2.0 (`callproc`): https://peps.python.org/pep-0249/
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- Flyway documentation — MySQL support: https://documentation.red-gate.com/fd/mysql-184127601.html

## Issues Found
No technical issues found.

## Review Notes
- The `DELIMITER` directive used in the migration file example is a MySQL client-side command, not a SQL statement. Flyway's MySQL parser understands it, but other migration tools may require different syntax for multi-statement procedure definitions. The post correctly names Flyway and Liquibase as supporting tools.
- The Python `callproc` example assumes a MySQL driver that supports cursor as a context manager (`with conn.cursor() as cur`). This works with modern versions of both `mysql-connector-python` and `PyMySQL`, which is reasonable for a current guide.
- The JavaScript example uses `pool.execute()` from the `mysql2` package. It does not show the `mysql` (v1) package, which is now deprecated — this is appropriate.
- MySQL 8.0.16+ supports CHECK constraints, but they remain limited to single-row, single-table expressions. The post's claim that stored procedures can enforce "complex cross-table constraints beyond what CHECK constraints support" is accurate.
