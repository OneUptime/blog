# Validation Summary: How to Alter a Stored Procedure in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL: ALTER PROCEDURE, DROP PROCEDURE, CREATE PROCEDURE)
- information_schema.ROUTINES
- mysqldump CLI

## Sources Consulted
- MySQL 8.0 Reference Manual — ALTER PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/alter-procedure.html
- MySQL 8.0 Reference Manual — DROP PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/drop-procedure.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA ROUTINES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual — Stored Routines and Privileges: https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html

## Issues Found
1. **Incorrect claim about grants surviving DROP + CREATE in MySQL 8.0+.** The post stated: "When you drop and recreate a procedure, grants on the procedure survive (in MySQL 8.0+). In older versions, verify grants after recreation." Per the MySQL 8.0 documentation, `EXECUTE` and `ALTER ROUTINE` privileges are revoked when a routine is dropped, regardless of MySQL version. Fixed the "Granting Execute Permissions After Recreate" section and the Summary to accurately state that grants are revoked on DROP and must always be re-granted after recreation.

## Review Notes
- The section titled "Safe Deployment with Transactions" could be slightly misleading due to the title mentioning "Transactions," but the body text correctly explains that DDL causes implicit commits and recommends a scripted sequence instead. No change made since the content is accurate.
- MySQL 8.0.29+ added `CREATE PROCEDURE IF NOT EXISTS` syntax, which the post does not mention. This is a minor omission but not an error, since the post focuses on replacing/modifying existing procedures rather than conditional creation.
- The `LANGUAGE SQL` characteristic is also available for ALTER PROCEDURE per the docs, but is omitted from the post's list. This is a minor omission since `LANGUAGE SQL` is the only option in MySQL and rarely used explicitly.
