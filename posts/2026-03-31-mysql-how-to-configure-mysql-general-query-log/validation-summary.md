# Validation Summary: How to Configure MySQL General Query Log

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (general query log, slow query log, log_output, mysql.general_log table)
- MySQL configuration files (my.cnf / mysqld.cnf)
- MySQL Enterprise Audit plugin (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual — The General Query Log: https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual — Server System Variables (general_log, general_log_file, log_output): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — The Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual — SET Syntax for Variable Assignment: https://dev.mysql.com/doc/refman/8.0/en/set-variable.html

## Issues Found
1. **Incorrect reference to `log_statements_unsafe_for_binlog`**: The "Log Only Specific Users" section mentioned using `log_statements_unsafe_for_binlog` as an approach for per-user general query log filtering. This variable is unrelated — it controls whether unsafe statements for binary logging produce warnings. Removed the incorrect reference and replaced with accurate alternatives (post-hoc filtering via grep/SQL and audit plugin).

2. **Invalid `SET @@SESSION.general_log = ON;` command**: The post included a session-level SET for `general_log`, but this variable is GLOBAL-only and cannot be set at the session level. Attempting this would produce an error. The post's own inline comment acknowledged this contradiction ("Note: this is a global variable"). Removed this broken example entirely and replaced the section with correct approaches for per-user log filtering.

## Review Notes
- The "5-15% throughput reduction" performance claim is a reasonable general estimate but is not sourced from official MySQL documentation. Actual overhead varies significantly based on workload, storage, and I/O subsystem. This is acceptable for a blog post but readers should benchmark their own environments.
- The `long_query_time = 0` trick for logging all queries to the slow query log is correctly described and is a well-known MySQL technique.
- The TRUNCATE TABLE mysql.general_log command is correct; note that in some MySQL versions the general log must be disabled first before truncating.
