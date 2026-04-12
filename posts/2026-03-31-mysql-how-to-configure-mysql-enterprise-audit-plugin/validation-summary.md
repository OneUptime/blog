# Validation Summary: How to Configure MySQL Enterprise Audit Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Audit plugin (`audit_log`)
- MySQL 8.0 audit log filtering API

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Enterprise Audit — https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual: Audit Log System Variables — https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual: Audit Log Filtering — https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html

## Issues Found

1. **`SET GLOBAL audit_log_file` is invalid**: The post showed `SET GLOBAL audit_log_file = '/var/log/mysql/audit.log';` as a way to set the log file at runtime. `audit_log_file` is a read-only system variable that can only be configured at server startup. Removed the `SET GLOBAL` example and clarified that the variable requires a restart.

2. **`CSV` is not a valid audit log format**: The format table listed `CSV` as an option for `audit_log_format`. The only valid values are `OLD`, `NEW`, and `JSON`. Removed the `CSV` row from the table.

3. **Incorrect version for JSON format**: The post stated JSON format was available from "MySQL 8.0.14+". JSON audit log format was introduced in MySQL 8.0.11. Corrected to "MySQL 8.0.11+".

4. **`audit_log_filter_set_user()` syntax error**: The call used `'suspicious_user'@'%'` (MySQL account literal syntax with separate quoted parts). The `audit_log_filter_set_user()` function takes the user as a single string argument in `'user@host'` format. Changed to `'suspicious_user@%'`.

## Review Notes
- The `audit_log_policy` variable and the legacy `audit_log_connection_policy`/`audit_log_statement_policy` variables are deprecated as of MySQL 8.0.34 in favor of the rule-based filtering API. The post covers both approaches, which is fine, but a future update could note the deprecation.
- The `audit_log_rotate()` function referenced in the log rotation section was introduced in MySQL 8.0.31. Earlier versions used `SET GLOBAL audit_log_flush = ON` for manual rotation. A version note could be helpful in a future update.
- The "Protecting the Audit Log from Tampering" section uses the deprecated `audit_log_connection_policy` and `audit_log_statement_policy` variables. MySQL 8.0.28+ introduced the `audit_log_disable` system variable which more directly addresses the concern of preventing the audit log from being disabled.
