# Validation Summary: How to Use SHOW CREATE FUNCTION in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SHOW CREATE FUNCTION statement
- Stored functions (CREATE FUNCTION, DROP FUNCTION)
- information_schema.ROUTINES
- SHOW FUNCTION STATUS
- mysqldump CLI tool

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE FUNCTION — https://dev.mysql.com/doc/refman/8.0/en/show-create-function.html
- MySQL 8.0 Reference Manual: CREATE FUNCTION (Stored Routines) — https://dev.mysql.com/doc/refman/8.0/en/create-function.html
- MySQL 8.0 Reference Manual: SHOW FUNCTION STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: ALTER FUNCTION — https://dev.mysql.com/doc/refman/8.0/en/alter-function.html
- MySQL 8.0 Reference Manual: Stored Routines Privileges — https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html

## Issues Found
No technical issues found.

## Review Notes
- The sample output uses `utf8mb4_0900_ai_ci` collation, which is specific to MySQL 8.0+. The post does not explicitly state a target MySQL version, but all syntax and behavior described is accurate for MySQL 8.0+.
- The Required Privileges section is minimal — it shows SHOW FUNCTION STATUS for listing and a GRANT for create/drop. It does not mention that SHOW CREATE FUNCTION itself requires either the SHOW_ROUTINE privilege (MySQL 8.0.20+), global SELECT privilege, or being the routine's DEFINER. This is not an error but could be a useful addition in the future.
- The post correctly notes that modifying a function body requires DROP and recreate, since ALTER FUNCTION only changes characteristics (COMMENT, SQL SECURITY, etc.), not the function body.
