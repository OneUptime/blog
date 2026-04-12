# Validation Summary: How to Drop a Stored Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL DDL (DROP FUNCTION, CREATE FUNCTION)
- information_schema system tables (ROUTINES, VIEWS)

## Sources Consulted
- MySQL 8.0 Reference Manual — DROP FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-function.html
- MySQL 8.0 Reference Manual — CREATE FUNCTION Statement for Stored Functions: https://dev.mysql.com/doc/refman/8.0/en/create-function.html
- MySQL 8.0 Reference Manual — The information_schema ROUTINES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual — The information_schema VIEWS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html
- MySQL 8.0 Reference Manual — Stored Routines and Privileges: https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html
- MySQL 8.0 Reference Manual — CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html

## Issues Found
No technical issues found.

## Review Notes
- The post mentions the `SUPER` privilege as an alternative for dropping functions. While this works in practice, `SUPER` is deprecated in MySQL 8.0 in favor of more granular dynamic privileges. This is not incorrect but could be noted in a future update.
- The `ROUTINE_DEFINITION` column in `information_schema.ROUTINES` may return NULL if the querying user lacks sufficient privileges on the routine, which could cause the dependency check queries to miss some dependents. This is a minor operational caveat, not an error in the post.
- All SQL syntax is correct and follows current MySQL 8.0 conventions.
- The claim that MySQL does not support `CREATE OR REPLACE FUNCTION` (unlike MariaDB) is accurate.
- The `format_phone` function example is syntactically valid and produces correctly formatted output for 10-digit US phone numbers.
