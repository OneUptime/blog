# Validation Summary: How to Secure MySQL Against Brute Force Attacks

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Connection Control Plugin
- MySQL Performance Schema
- UFW (Uncomplicated Firewall)
- systemd

## Sources Consulted
- MySQL 8.0 Reference Manual — `max_connect_errors` system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connect_errors
- MySQL 8.0 Reference Manual — FLUSH statement (FLUSH HOSTS deprecation): https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual — Connection Control plugin variables: https://dev.mysql.com/doc/refman/8.0/en/connection-control-variables.html
- MySQL 8.0 Reference Manual — ALTER USER (FAILED_LOGIN_ATTEMPTS, PASSWORD_LOCK_TIME): https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — `performance_schema.host_cache` table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-host-cache-table.html
- MySQL 8.0 Reference Manual — Statement summary tables (`events_statements_summary_by_digest`): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found

### 1. Incorrect description of `max_connect_errors` behavior
**What was wrong:** The post stated that `max_connect_errors` blocks a host after "consecutive failed connections," implying it counts failed password/authentication attempts. In reality, `max_connect_errors` only counts protocol-level connection errors (e.g., interrupted handshakes). Wrong-password attempts do NOT increment this counter.
**What was changed:** Clarified that `max_connect_errors` tracks protocol-level connection errors, not authentication failures, and added a note directing readers to the Connection Control plugin and account lockout policies for authentication-based brute force protection.

### 2. `FLUSH HOSTS` is deprecated
**What was wrong:** The post recommended `FLUSH HOSTS` to unblock hosts, but this command is deprecated as of MySQL 8.0.23.
**What was changed:** Replaced the primary command with `TRUNCATE TABLE performance_schema.host_cache` and added a note that `FLUSH HOSTS` is deprecated since MySQL 8.0.23.

### 3. Incorrect monitoring query using `events_statements_summary_by_digest`
**What was wrong:** The post queried `performance_schema.events_statements_summary_by_digest` filtering `DIGEST_TEXT LIKE '%Access denied%'` to find failed logins. This is incorrect — `DIGEST_TEXT` contains normalized SQL statement text (e.g., `SELECT * FROM t WHERE id = ?`), not error messages. Authentication failures occur before any SQL statement executes, so they never appear in this table.
**What was changed:** Replaced with a correct query against `performance_schema.host_cache` that selects `COUNT_AUTHENTICATION_ERRORS`, `COUNT_HANDSHAKE_ERRORS`, and `SUM_CONNECT_ERRORS` per host.

## Review Notes
- The Connection Control plugin section is accurate. All variable names and defaults were verified against official documentation.
- The account lockout feature (`FAILED_LOGIN_ATTEMPTS`, `PASSWORD_LOCK_TIME`) was correctly attributed to MySQL 8.0.19.
- The `ufw` firewall commands and `bind-address` configuration are correct.
- The `grep` command for checking the error log is a valid approach, though "Access denied" messages appear in the error log only if `log_error_verbosity` is set to 3 (the default is 2 in MySQL 8.0, which includes errors and warnings but may not include all connection notes).
