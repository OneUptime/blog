# Validation Summary: How to Use SHOW PROCEDURE STATUS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL — SHOW PROCEDURE STATUS statement
- SQL — SHOW CREATE PROCEDURE statement
- information_schema.ROUTINES table

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW PROCEDURE STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA ROUTINES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual — SHOW CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/show-create-procedure.html

## Issues Found
No technical issues found.

## Review Notes
- All three syntax forms (bare, LIKE, WHERE) are correctly documented per the official MySQL reference.
- The output columns listed (Db, Name, Type, Definer, Modified, Created, Security_type, Comment, character_set_client, collation_connection, Database Collation) match the official documentation exactly.
- The LIKE clause correctly describes filtering by procedure name.
- The information_schema.ROUTINES column names (ROUTINE_NAME, ROUTINE_TYPE, DEFINER, CREATED, LAST_ALTERED, SECURITY_TYPE, ROUTINE_COMMENT, ROUTINE_SCHEMA) are all accurate.
- The Security_type values (DEFINER and INVOKER) are correctly described.
- Minor note: SHOW CREATE PROCEDURE may return NULL for the procedure body if the user lacks sufficient privileges (SHOW_ROUTINE or global SELECT). This is not an error in the post but could be a useful addition in a future update.
