# Validation Summary: How to Configure the MySQL Error Log

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 (and references to MySQL 5.7)
- MySQL error log system
- MySQL component-based logging (log_filter_internal, log_sink_internal, log_sink_json, log_filter_dragnet)
- performance_schema.error_log table
- Linux logrotate
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual: The Error Log (https://dev.mysql.com/doc/refman/8.0/en/error-log.html)
- MySQL 8.0 Reference Manual: log_error_verbosity system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_log_error_verbosity)
- MySQL 8.0 Reference Manual: Error Log Components (https://dev.mysql.com/doc/refman/8.0/en/error-log-component-configuration.html)
- MySQL 8.0 Reference Manual: log_filter_dragnet (https://dev.mysql.com/doc/refman/8.0/en/error-log-filter-dragnet.html)
- MySQL 8.0 Reference Manual: FLUSH Statement (https://dev.mysql.com/doc/refman/8.0/en/flush.html)
- MySQL 8.0 Reference Manual: The error_log Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-error-log-table.html)
- MySQL 5.7 Reference Manual: log_error_verbosity (https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html#sysvar_log_error_verbosity)

## Issues Found
1. **Incorrect claim that MySQL 8.0 introduced `log_error_verbosity`**: The post stated "MySQL 8.0 introduced a more granular verbosity system using `log_error_verbosity`". In fact, `log_error_verbosity` has been available since MySQL 5.7.2. What MySQL 8.0 introduced was the component-based error logging system (covered in a separate section). Fixed by changing the wording to: "You can control the verbosity of the error log using `log_error_verbosity` (available since MySQL 5.7.2)".

2. **Incorrect default value for `log_error_verbosity`**: The post listed verbosity level 3 as the default. In MySQL 8.0, the default is 2 (errors and warnings). The default was 3 in MySQL 5.7. Fixed by annotating both levels with their respective version defaults: level 2 is the default in MySQL 8.0, level 3 was the default in MySQL 5.7.

## Review Notes
- The default error log location description is slightly simplified. In MySQL 8.0, if `log_error` is not given on the command line, the default destination is the console (stderr). The `<hostname>.err` file in the data directory is the default when `--log-error` is specified without a filename. The post's description is a reasonable simplification for a practical guide.
- The logrotate postrotate script uses `mysqladmin flush-logs`, which flushes all log types. Using `FLUSH ERROR LOGS` would be more targeted, but the approach shown is a widely used convention and is not incorrect.
- All SQL syntax, component installation commands, dragnet filter rules, and performance_schema queries are correct.
- The `performance_schema.error_log` table availability (MySQL 8.0.22+) is correctly stated.
