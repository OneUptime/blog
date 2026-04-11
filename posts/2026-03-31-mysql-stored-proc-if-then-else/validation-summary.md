# Validation Summary: How to Use IF THEN ELSE in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, conditional statements)
- SQL (DML statements, SIGNAL/SQLSTATE error handling)

## Sources Consulted
- MySQL 8.0 Reference Manual — IF Statement: https://dev.mysql.com/doc/refman/8.0/en/if.html
- MySQL 8.0 Reference Manual — CASE Statement: https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — DECLARE Local Variable: https://dev.mysql.com/doc/refman/8.0/en/declare-local-variable.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows MySQL stored procedure conventions.
- All expected output values were verified against the sample data and procedure logic — every computation is accurate.
- The distinction between the IF statement (stored procedure) and IF() function (SQL expression) is correctly noted.
- The note about CASE statement raising Error 1339 when no WHEN matches and no ELSE is present is accurate.
- The DELIMITER usage pattern is correct throughout.
- The "helper functions" mention in Best Practices is a reasonable simplification — in MySQL these would technically be stored functions or stored procedures, but the meaning is clear in context.
