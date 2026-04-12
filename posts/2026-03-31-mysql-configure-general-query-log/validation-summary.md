# Validation Summary: How to Configure the MySQL General Query Log

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general query log, server variables, log_output, sql_log_off)
- systemd (service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: The General Query Log — https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual: Server System Variables (general_log, general_log_file, log_output, sql_log_off) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Log Table — https://dev.mysql.com/doc/refman/8.0/en/log-destinations.html

## Issues Found
1. **Section "Logging Only for a Specific Session" was misleading.** The original section claimed you could "enable logging just for the current session" using `SET SESSION sql_log_off = OFF`, framing it as a way to debug one connection "without flooding the global log." This is incorrect: `sql_log_off = OFF` is the default value, and `sql_log_off` can only *suppress* logging for a session (when set to ON) — it cannot enable per-session logging when the global `general_log` is OFF. The section was rewritten to accurately describe the variable's purpose: suppressing logging for specific sessions when the global general log is already enabled. The section heading was also changed from "Logging Only for a Specific Session" to "Suppressing Logging for a Specific Session" to reflect the corrected semantics.

## Review Notes
- All SQL syntax, variable names, and `mysql.general_log` table column names are correct.
- The `SHOW VARIABLES`, `SET GLOBAL`, and `SET SESSION` commands use valid syntax.
- The my.cnf configuration format is correct for the `[mysqld]` section.
- The `log_output = 'FILE,TABLE'` combined value is correct.
- The requirement to disable the general log before truncating `mysql.general_log` is accurate.
- The default log file name (`<hostname>.log` in the data directory) is accurate.
- Performance guidance is sound: the general query log does add meaningful overhead on busy servers.
