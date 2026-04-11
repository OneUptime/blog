# Validation Summary: How to Use DEFINER vs INVOKER Security in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (stored procedures, security contexts)
- SQL SECURITY DEFINER and INVOKER modes
- MySQL privilege system (GRANT, REVOKE, EXECUTE)
- information_schema.ROUTINES
- Prepared statements and dynamic SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: Stored Object Access Control — https://dev.mysql.com/doc/refman/8.0/en/stored-objects-security.html
- MySQL 8.0 Reference Manual: ALTER PROCEDURE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-procedure.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
No technical issues found.

## Review Notes
- The `USER()` function in the INVOKER examples returns the MySQL client username and hostname in `'user@host'` format, not an email address. This is used conceptually to represent identifying the current user, which is reasonable for a teaching example, though real applications would typically map MySQL users to application users differently.
- The last code example (the dangerous `run_search` procedure) omits `DELIMITER //` and `DELIMITER ;` unlike all other procedure examples in the post. This is not an error — DELIMITER is a mysql client command, not SQL syntax, and is not required in all execution contexts — but it is a minor inconsistency in presentation style.
- All SQL syntax, column names, SQLSTATE codes, and privilege statements are correct and current as of MySQL 8.0+.
