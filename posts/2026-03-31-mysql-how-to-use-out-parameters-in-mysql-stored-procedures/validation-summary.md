# Validation Summary: How to Use OUT Parameters in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures, Parameter Modes: IN, OUT, INOUT)
- SQL (DELIMITER, SELECT INTO, CREATE PROCEDURE)
- Python (mysql-connector-python)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE and CREATE FUNCTION Statements: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — CALL Statement: https://dev.mysql.com/doc/refman/8.0/en/call.html
- MySQL Connector/Python Developer Guide — cursor.callproc(): https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-callproc.html
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html

## Issues Found
No technical issues found.

## Review Notes
- The Python example retrieves OUT parameters via session variables (`@_GetCustomerStats_N`). An alternative idiomatic approach is to use the return value of `cursor.callproc()`, which returns a modified tuple with OUT values filled in. Both approaches are valid.
- The `CheckAndCount` procedure counts entries in `information_schema.TABLES` matching a table name, so `row_count` will be 0 or 1 (not the row count of the table itself). The naming is slightly misleading but the code is correct SQL and demonstrates the OUT parameter pattern adequately.
