# Validation Summary: How to Use System Variables (@@var) in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL System Variables (@@GLOBAL, @@SESSION)
- MySQL Performance Schema
- SET PERSIST / SET PERSIST_ONLY (MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — SET Syntax for Variable Assignment: https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual — SHOW VARIABLES Statement: https://dev.mysql.com/doc/refman/8.0/en/show-variables.html
- MySQL 8.0 Reference Manual — SET NAMES Statement: https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual — performance_schema.variables_info Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html
- MySQL 8.0 Reference Manual — performance_schema.global_variables Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html
- MySQL 8.0 Reference Manual — Persisted System Variables: https://dev.mysql.com/doc/refman/8.0/en/persisted-system-variables.html

## Issues Found
1. **Incorrect `performance_schema.variables_info` query**: The original query selected `variable_value` from `performance_schema.variables_info`, but that table does not have a `variable_value` column. Its columns are `VARIABLE_NAME`, `VARIABLE_SOURCE`, `VARIABLE_PATH`, `MIN_VALUE`, and `MAX_VALUE`. The `variable_value` column exists in `performance_schema.global_variables`. Fixed by rewriting the query to JOIN `performance_schema.variables_info` with `performance_schema.global_variables` on `variable_name`.

## Review Notes
- The privilege note ("Requires appropriate privileges (SUPER or SYSTEM_VARIABLES_ADMIN)") applies primarily to global variables. Most session variables can be set without special privileges; only restricted session variables require `SESSION_VARIABLES_ADMIN` or `SYSTEM_VARIABLES_ADMIN`. The statement is not wrong but could be more precise.
- `SET NAMES utf8mb4` also implicitly sets `collation_connection` to the default collation for utf8mb4, which is not mentioned in the equivalence breakdown. The three SET statements shown are consistent with the MySQL docs' own equivalence description, so this is acceptable.
- Setting `interactive_timeout` at the session level after connection has been established does not change the effective timeout for the current connection. The `interactive_timeout` value is only used at connection time to initialize `wait_timeout` for interactive clients. The SQL syntax shown is valid, but readers may misunderstand its runtime effect.
