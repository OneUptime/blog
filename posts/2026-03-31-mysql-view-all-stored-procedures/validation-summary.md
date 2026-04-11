# Validation Summary: How to View All Stored Procedures in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (SHOW PROCEDURE STATUS, SHOW CREATE PROCEDURE)
- MySQL information_schema (ROUTINES, PARAMETERS tables)
- mysqldump CLI tool

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROCEDURE STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- MySQL 8.0 Reference Manual: SHOW CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/show-create-procedure.html
- MySQL 8.0 Reference Manual: information_schema.ROUTINES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: information_schema.PARAMETERS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-parameters-table.html
- MySQL 8.0 Reference Manual: information_schema tables list — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-reference.html
- MySQL 8.0 Reference Manual: Grant Tables (mysql.procs_priv) — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: Stored Routine Privileges — https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html

## Issues Found

### 1. Outdated `mysql.proc` reference for ROUTINE_DEFINITION privilege note
- **What was wrong:** The note stated that `ROUTINE_DEFINITION` may be NULL if the user lacks the `SELECT` privilege on `mysql.proc`. The `mysql.proc` table was removed in MySQL 8.0 (replaced by data dictionary tables). This guidance is only valid for MySQL 5.7 and earlier.
- **What was changed:** Updated the note to cover both MySQL 8.0+ (which requires `SHOW_ROUTINE`, `CREATE ROUTINE`, `ALTER ROUTINE`, or `EXECUTE` privilege, or being the routine DEFINER) and MySQL 5.7 and earlier (which requires `SELECT` on `mysql.proc`).
- **Why:** The post doesn't specify a MySQL version, so it should provide accurate guidance for current MySQL versions while noting the older behavior.

### 2. Non-existent `information_schema.ROUTINE_PRIVILEGES` table
- **What was wrong:** The "Checking Procedure Privileges" section queried `information_schema.ROUTINE_PRIVILEGES`, which does not exist in MySQL. This table is defined in the SQL standard and implemented by PostgreSQL, but MySQL has never included it. The query would fail with `ERROR 1109 (42S02): Unknown table 'ROUTINE_PRIVILEGES' in information_schema`.
- **What was changed:** Replaced the query with the correct MySQL approach using `mysql.procs_priv`, which is the grant table that stores routine-level privileges in MySQL.
- **Why:** The original query would produce an error and not return any results.

## Review Notes
- All other SQL syntax (SHOW PROCEDURE STATUS, information_schema.ROUTINES queries, information_schema.PARAMETERS queries, SHOW CREATE PROCEDURE) is correct and verified against MySQL 8.0 documentation.
- The mysqldump flags (`--no-data`, `--routines`, `--no-create-info`) are correct, and the note about `--routines` not being included by default is accurate.
- The `--no-create-info` flag in the first mysqldump example suppresses CREATE TABLE statements but will still output some other DDL like SET statements. This is a minor nuance but not technically incorrect for the stated purpose.
