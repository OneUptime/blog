# Validation Summary: How to Disable Remote Root Login in MySQL

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- MySQL Enterprise Audit plugin
- mysql_secure_installation utility
- MySQL user account management (CREATE USER, DROP USER, ALTER USER, GRANT)
- MySQL server configuration (my.cnf / bind-address)

## Sources Consulted
- MySQL 8.0 Reference Manual: DROP USER Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-user.html
- MySQL 8.0 Reference Manual: ALTER USER Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Server System Variables (bind-address) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual: mysql_secure_installation — https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual: MySQL Enterprise Audit — https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual: Audit Log Filtering Functions — https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html
- MySQL 8.0 Reference Manual: audit_log_filter_id system variable — https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html#sysvar_audit_log_filter_id

## Issues Found
1. **Invalid audit log configuration command**: The post used `SET GLOBAL audit_log_filter_id = 1;` to configure audit logging. The `audit_log_filter_id` variable is a read-only session variable that is automatically set by MySQL when a filter is assigned to a user — it cannot be set manually with SET GLOBAL. Replaced with the correct audit log filter functions: `audit_log_filter_set_filter()` to create a filter and `audit_log_filter_set_user()` to apply it to all users.

## Review Notes
- The post already includes an appropriate note at the top clarifying that `audit_log` is part of MySQL Enterprise Audit and is not available in Community Edition. This is accurate and important context.
- The post drops `'root'@'::1'` (IPv6 loopback) alongside `'root'@'%'`. While `::1` is technically a localhost address, removing it is a reasonable hardening step to consolidate root access to only the `'root'@'localhost'` entry.
- The `PASSWORD EXPIRE INTERVAL 180 DAY` clause in the password rotation section is valid MySQL 5.7+ syntax and is a good security recommendation.
- All SQL syntax, CLI commands, error codes, and configuration directives are correct for MySQL 5.7+ and 8.0.
