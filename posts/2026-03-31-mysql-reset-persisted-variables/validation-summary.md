# Validation Summary: How to Reset Persisted Variables in MySQL 8

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8
- RESET PERSIST statement
- performance_schema.persisted_variables table
- performance_schema.variables_info table
- mysqld-auto.cnf configuration file

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 15.7.8.7 — RESET PERSIST Statement (https://dev.mysql.com/doc/refman/8.0/en/reset-persist.html)
- MySQL 8.0 Reference Manual, Section 29.12.14.1 — Performance Schema persisted_variables Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-persisted-variables-table.html)
- MySQL 8.0 Reference Manual, Section 29.12.14.2 — Performance Schema variables_info Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html)
- MySQL 8.0 Reference Manual, Section 7.1.9.3 — Persisted System Variables (https://dev.mysql.com/doc/refman/8.0/en/persisted-system-variables.html)
- MySQL 8.0 Reference Manual — Server System Variables, max_connections (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections)
- MySQL 8.0 Server Error Message Reference — Error 3615 (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)

## Issues Found

### 1. Incorrect column names for performance_schema.persisted_variables
**What was wrong:** The query used `SET_VALUE`, `SET_USER`, and `SET_TIME` as column names. The `persisted_variables` table only has two columns: `VARIABLE_NAME` and `VARIABLE_VALUE`. The metadata columns `SET_USER` and `SET_TIME` belong to the separate `performance_schema.variables_info` table.
**What was changed:** Fixed the query to use the correct columns (`VARIABLE_NAME`, `VARIABLE_VALUE`), updated the example output table to match, and added a second query showing how to join with `variables_info` to get the `SET_USER` and `SET_TIME` metadata.

### 2. Error behavior incorrectly described as a warning
**What was wrong:** The post stated that `RESET PERSIST sort_buffer_size` (without `IF EXISTS`) on a non-persisted variable produces a "warning". It actually produces an **error** (ERROR 3615). The post also cited the wrong error code (3616, which is `ER_LONGITUDE_OUT_OF_RANGE`, a GIS error) and the wrong message text ("was not found in persisted configuration" instead of "does not exist in persisted config file").
**What was changed:** Changed "warning" to "error", fixed the error code from 3616 to 3615, corrected the error message text, updated the example output to show an ERROR line instead of "Query OK" with a warning, and clarified that `IF EXISTS` downgrades the error to a warning.

### 3. Incomplete privilege requirements
**What was wrong:** The post stated only `SYSTEM_VARIABLES_ADMIN` is required. This is true for dynamic variables, but resetting persisted **read-only** variables additionally requires the `PERSIST_RO_VARIABLES_ADMIN` privilege.
**What was changed:** Added the `PERSIST_RO_VARIABLES_ADMIN` grant with a comment clarifying it is needed for read-only variables.

### 4. Summary section referenced "warnings" instead of "errors"
**What was wrong:** The summary paragraph said `RESET PERSIST IF EXISTS` avoids "warnings" — but it avoids errors (by downgrading them to warnings).
**What was changed:** Changed "warnings" to "errors" in the summary.

## Review Notes
- The `mysqld-auto.cnf` empty-state JSON example (`{"Version": 1, "mysql_server": {}}`) is plausible and consistent with the documented format, though the official docs do not explicitly show the empty state. It also omits the `mysql_server_static_options` sub-key used for read-only variables, but this is acceptable for a general tutorial.
- The RESET PERSIST syntax, behavior descriptions (running server unaffected, changes on restart), and max_connections default value (151) are all correct.
- The post correctly notes there is no multi-variable syntax for RESET PERSIST.
