# Validation Summary: How to View All Stored Functions in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (5.x and 8.0+)
- information_schema.ROUTINES table
- SHOW FUNCTION STATUS / SHOW CREATE FUNCTION statements
- MySQL privilege system (SHOW_ROUTINE dynamic privilege)

## Sources Consulted
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: SHOW FUNCTION STATUS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-function-status.html
- MySQL 8.0 Reference Manual: SHOW CREATE FUNCTION Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-function.html

## Issues Found
1. **Incorrect privilege name (3 occurrences)**: The post used `SHOW ROUTINE` (with a space) when referring to the MySQL privilege. The correct name is `SHOW_ROUTINE` (with an underscore) — it is a dynamic privilege introduced in MySQL 8.0.20. Fixed in inline code references and the GRANT example.
2. **Incorrect MySQL version**: The post stated the `SHOW_ROUTINE` privilege was introduced in "MySQL 8.0.22+". It was actually introduced in MySQL 8.0.20. Fixed to "MySQL 8.0.20+".

## Review Notes
- All SQL queries are syntactically correct and use valid column names from information_schema.ROUTINES.
- The SHOW FUNCTION STATUS output columns listed (Db, Name, Type, Definer, Modified, Created, Security_type, Comment, character_set_client) are accurate.
- The note about ROUTINE_DEFINITION being NULL without sufficient privileges is correct and important.
- The mention of `mysql.proc` for MySQL 5.x is accurate — this table was removed in MySQL 8.0 and replaced by the data dictionary.
- The GRANT example correctly uses the global scope (ON *.*), which is required for dynamic privileges like SHOW_ROUTINE.
