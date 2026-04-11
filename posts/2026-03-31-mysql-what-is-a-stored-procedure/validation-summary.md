# Validation Summary: What Is a Stored Procedure in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (stored procedures, DELIMITER, CREATE PROCEDURE, CALL, parameter modes, DECLARE, control flow, HANDLER, RESIGNAL, SHOW PROCEDURE STATUS)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: CALL Statement — https://dev.mysql.com/doc/refman/8.0/en/call.html
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual: RESIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/resignal.html
- MySQL 8.0 Reference Manual: SHOW PROCEDURE STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- Oracle PL/SQL documentation (to confirm PL/SQL is Oracle-specific, not MySQL)

## Issues Found
1. **Incorrect tag "PL/SQL" in metadata (line 5):** PL/SQL is Oracle's procedural language extension for SQL. MySQL does not use PL/SQL; its stored procedure language is based on the SQL/PSM (SQL/Persistent Stored Modules) standard. Changed the tag from "PL/SQL" to "SQL/PSM".

## Review Notes
- The Overview describes stored procedures as a "precompiled collection of SQL statements." This is a common simplification. In MySQL, stored procedures are parsed at creation time but individual SQL statements within them are re-optimized at execution time on a per-connection basis. This differs from Oracle or SQL Server where true precompilation occurs. The phrasing was left as-is since it is widely used in educational material, but readers should be aware of this nuance.
- All SQL code examples (CREATE PROCEDURE, CALL, DELIMITER usage, IN/OUT/INOUT parameters, DECLARE variables, IF/ELSEIF/ELSE, DECLARE EXIT HANDLER, RESIGNAL, START TRANSACTION/COMMIT/ROLLBACK, SHOW PROCEDURE STATUS, SHOW CREATE PROCEDURE, DROP PROCEDURE IF EXISTS) are syntactically correct and consistent with MySQL 8.0 documentation.
- The `calculate_discount` arithmetic is correct: `100.00 * (1 - 15 / 100.0) = 85.00`.
- RESIGNAL (used in the error handling example) requires MySQL 5.5+, which is reasonable given current MySQL versions.
