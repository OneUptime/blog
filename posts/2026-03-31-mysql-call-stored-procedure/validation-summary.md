# Validation Summary: How to Call a Stored Procedure in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CALL statement, stored procedures, IN/OUT/INOUT parameters)
- Python (mysql-connector-python library)
- Node.js (mysql2/promise library)
- MySQL information_schema
- MySQL privilege system (GRANT EXECUTE)

## Sources Consulted
- MySQL 8.0 Reference Manual — CALL Statement: https://dev.mysql.com/doc/refman/8.0/en/call.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA ROUTINES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- mysql-connector-python documentation — cursor.callproc(): https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-callproc.html
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2

## Issues Found
No technical issues found.

## Review Notes
- The post correctly covers all three parameter modes (IN, OUT, INOUT) with working examples.
- The DELIMITER usage is correct and consistent throughout all procedure definitions.
- The Python example correctly uses `cursor.stored_results()` which is specific to mysql-connector-python for retrieving result sets from stored procedures.
- The Node.js example uses `conn.execute()` with a parameterized CALL statement, which works correctly with mysql2/promise. The result destructuring `rows[0]` to access the first result set is accurate.
- MySQL also allows calling no-argument procedures without parentheses (`CALL proc_name;`), but the post's recommendation to use empty parentheses is a valid and common convention.
- The INOUT example's arithmetic is verified: 100.00 - (100.00 * 15 / 100) = 85.00.
