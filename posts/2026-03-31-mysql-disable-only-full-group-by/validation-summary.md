# Validation Summary: How to Disable ONLY_FULL_GROUP_BY in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7, 8.0)
- SQL Mode system variable
- `ONLY_FULL_GROUP_BY` mode
- `ANY_VALUE()` function
- `SET PERSIST` (MySQL 8.0)
- my.cnf / mysqld-auto.cnf configuration

## Sources Consulted
- MySQL 5.7 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html
- MySQL 8.0 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual: SET PERSIST — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 5.7 Reference Manual: ANY_VALUE() — https://dev.mysql.com/doc/refman/5.7/en/miscellaneous-functions.html#function_any-value
- MySQL 5.7 Release Notes (5.7.5 changelog for ONLY_FULL_GROUP_BY default change)

## Issues Found

1. **Incorrect claim about ONLY_FULL_GROUP_BY history**: The post stated that ONLY_FULL_GROUP_BY "did not exist" in MySQL 5.5 or 5.6. This is incorrect — the mode has existed since MySQL 5.0.2. It was simply not included in the default `sql_mode` value until MySQL 5.7.5. Changed "did not exist" to "was not enabled by default."

2. **Contradictory description of SET PERSIST in summary**: The summary described `SET PERSIST` as a "clean runtime-only approach," which directly contradicts the body section that correctly explains it survives restarts by writing to `mysqld-auto.cnf`. Changed to "a clean approach that survives restarts without manual config edits."

## Review Notes
- The `REPLACE()` approach for removing modes from `sql_mode` is a commonly used pattern but is position-sensitive. The global/PERSIST versions use `'ONLY_FULL_GROUP_BY,'` (with trailing comma) while the session version uses `'ONLY_FULL_GROUP_BY'` (without). Both work correctly with the default MySQL sql_mode where ONLY_FULL_GROUP_BY appears first, but could behave unexpectedly with custom configurations where ONLY_FULL_GROUP_BY is the last mode in the list (the trailing-comma variant would fail to match). This is a widely-used convention and acceptable for a practical guide.
- The `my.cnf` example omits `NO_AUTO_CREATE_USER`, which is part of the MySQL 5.7 default but was removed in MySQL 8.0. The listed modes are a reasonable common subset that works across both versions.
- The `systemctl restart mysql` command uses the Debian/Ubuntu service name. On RHEL/CentOS systems, the service name is typically `mysqld`. This is a minor platform difference that doesn't warrant a fix.
