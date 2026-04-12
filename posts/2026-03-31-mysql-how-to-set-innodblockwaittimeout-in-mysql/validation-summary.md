# Validation Summary: How to Set innodb_lock_wait_timeout in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL Performance Schema
- MySQL system variables and configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout
- MySQL 8.0 Reference Manual: innodb_rollback_on_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_rollback_on_timeout
- MySQL 8.0 Reference Manual: performance_schema.data_locks — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: InnoDB Error Handling — https://dev.mysql.com/doc/refman/8.0/en/innodb-error-handling.html

## Issues Found
- **Malformed table border in sample output**: The separator line in the `SHOW VARIABLES` sample output used pipe characters (`|`) instead of plus signs (`+`) at column intersections (`+--------------------------|-------|` instead of `+--------------------------+-------+`). Fixed to match MySQL's actual output formatting.

## Review Notes
- The `performance_schema.data_locks` table used in the monitoring section is only available in MySQL 8.0+. In MySQL 5.7 and earlier, `information_schema.INNODB_LOCKS` would be the equivalent. The post does not specify a MySQL version, but the approach shown is correct for the current major version.
- All SQL syntax, SET GLOBAL/SESSION usage, config file format, error messages, default values, and behavioral descriptions are accurate.
- The claim that `innodb_rollback_on_timeout` is read-only at runtime is correct — it is a non-dynamic variable that can only be set at server startup.
- The default value of 50 seconds for `innodb_lock_wait_timeout` is correct.
