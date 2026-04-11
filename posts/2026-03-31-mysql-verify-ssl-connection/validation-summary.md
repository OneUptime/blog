# Validation Summary: How to Verify SSL Connection in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- SSL/TLS encryption
- MySQL Performance Schema
- MySQL CLI (`\s` / `status` command)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html) — verified `Ssl_cipher`, `Ssl_version`, `Ssl_cipher_list`, `Ssl_server_not_after`, `Ssl_server_not_before`, `Ssl_verify_mode`
- MySQL 8.0 Reference Manual: Server System Variables — `have_ssl`, `have_openssl` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema Status Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html) — verified `session_status` vs `status_by_thread` table schemas
- MySQL 8.0 Reference Manual: Performance Schema threads Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL 8.0 Reference Manual: Encrypted Connection TLS Protocols and Ciphers (https://dev.mysql.com/doc/refman/8.0/en/encrypted-connection-protocols-ciphers.html) — verified `tls_version` configuration

## Issues Found
1. **Incorrect query for checking SSL status of all active connections (lines 102-113):** The original query used a correlated subquery against `performance_schema.session_status` with a `processlist_id` filter. This is incorrect because `performance_schema.session_status` only reflects the current session's status variables and does not have a `processlist_id` column. To inspect SSL status of other sessions, you must use `performance_schema.status_by_thread` joined with `performance_schema.threads` (which maps `thread_id` to `processlist_id`). Fixed the query to use proper LEFT JOINs between `information_schema.processlist`, `performance_schema.threads`, and `performance_schema.status_by_thread`.

## Review Notes
- `have_ssl` and `have_openssl` are deprecated as of MySQL 8.0.26. They still function but may be removed in a future release. The post does not mention this deprecation, which could be added in a future update.
- The claim "MySQL 8.0 defaults to TLSv1.2 and TLSv1.3" is accurate for MySQL 8.0.28+ but earlier 8.0 releases also included TLSv1 and TLSv1.1 in the default `tls_version` value. The security recommendation to restrict to TLSv1.2+ is sound regardless.
- The `--ssl-ca` path `/var/lib/mysql/ca-cert.pem` is a common example path. In practice, certificate locations vary by installation.
- Using `performance_schema.status_by_thread` requires that the `performance_schema` is enabled and that the `events_statements_summary_by_thread_by_event_name` consumer is active — worth noting for hardened environments where Performance Schema may be disabled.
