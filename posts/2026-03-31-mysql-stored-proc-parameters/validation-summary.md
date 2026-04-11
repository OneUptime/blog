# Validation Summary: How to Use Parameters in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, parameter modes, DELIMITER, SELECT INTO, user variables)
- SQL (DDL, DML, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: CALL Statement (https://dev.mysql.com/doc/refman/8.0/en/call.html)
- MySQL 8.0 Reference Manual: User-Defined Variables (https://dev.mysql.com/doc/refman/8.0/en/user-variables.html)
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement (https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html)
- MySQL 8.0 Reference Manual: SELECT ... INTO Statement (https://dev.mysql.com/doc/refman/8.0/en/select-into.html)

## Issues Found
- **Incorrect average value format in GetOrderStats output**: The expected output for the `average` column showed `340.000000`, but the OUT parameter `p_avg` is declared as `DECIMAL(10,2)`. Since `AVG(amount)` is assigned into `p_avg` via `SELECT ... INTO`, the value is cast to `DECIMAL(10,2)`, and the user variable `@avg` receives `340.00`, not `340.000000`. Fixed the output to `340.00` and corrected the table formatting (the original was also missing a trailing space before the closing pipe character).

## Review Notes
- All SQL syntax (CREATE PROCEDURE, DELIMITER, SELECT INTO, CALL, SET, IF/ELSE) is correct and uses current MySQL 8.0 syntax.
- All computed output values were verified against the sample data and are arithmetically correct.
- The claim that MySQL does not support default parameter values natively is correct — this is a known MySQL limitation compared to other databases like PostgreSQL or SQL Server.
- The use of `LIMIT p_limit` with a stored procedure parameter is valid in MySQL 5.5.6+ and current versions.
- The COALESCE pattern for simulating default parameter values is a well-known and valid workaround.
- The best practices section is sound; the suggestion to consider JSON for many parameters is relevant for MySQL 5.7+ which has native JSON support.
