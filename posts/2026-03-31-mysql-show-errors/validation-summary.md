# Validation Summary: How to Use SHOW ERRORS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW ERRORS, SHOW WARNINGS, GET DIAGNOSTICS, stored procedures)
- SQL (DDL/DML error handling)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW ERRORS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-errors.html)
- MySQL 8.0 Reference Manual: SHOW WARNINGS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-warnings.html)
- MySQL 8.0 Reference Manual: GET DIAGNOSTICS Statement (https://dev.mysql.com/doc/refman/8.0/en/get-diagnostics.html)
- MySQL 8.0 Reference Manual: The Diagnostics Area (https://dev.mysql.com/doc/refman/8.0/en/diagnostics-area.html)
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement (https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html)
- MySQL 8.0 Reference Manual: Server System Variables — error_count (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_error_count)
- MySQL Error Reference: Error 1062 ER_DUP_ENTRY (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)

## Issues Found
No technical issues found.

## Review Notes
- The SHOW ERRORS syntax (basic, LIMIT n, LIMIT offset/count) is correct per MySQL documentation.
- Error code 1062 (ER_DUP_ENTRY) for duplicate key violations is accurate.
- GET DIAGNOSTICS was indeed introduced in MySQL 5.6; the CONDITION 1 syntax with MYSQL_ERRNO and MESSAGE_TEXT is correct.
- The stored procedure handler example correctly uses DECLARE EXIT HANDLER FOR 1062. When the handler activates, MySQL pushes the current diagnostics area to the stack and creates a new one with the triggering condition as condition 1, so SHOW ERRORS inside the handler does show the triggering error.
- The @@error_count session variable name and usage are correct.
- The claim about multiple errors from multi-row statements is slightly imprecise (single INSERT statements typically stop at the first error unless using INSERT IGNORE, which converts errors to warnings), but LOAD DATA INFILE and other statements can produce multiple diagnostics conditions, so the LIMIT clause demonstration is reasonable.
