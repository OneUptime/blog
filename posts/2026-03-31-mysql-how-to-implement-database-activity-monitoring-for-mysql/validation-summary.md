# Validation Summary: How to Implement Database Activity Monitoring for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (Percona Audit Log Plugin)
- Performance Schema
- Filebeat
- Elasticsearch
- Python (mysql.connector)

## Sources Consulted
- MySQL 8.0 Reference Manual: Triggers — https://dev.mysql.com/doc/refman/8.0/en/triggers.html
- MySQL 8.0 Reference Manual: performance_schema.accounts — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-accounts-table.html
- MySQL 8.0 Reference Manual: performance_schema.host_cache — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-host-cache-table.html
- MySQL 8.0 Reference Manual: Server Status Variables (Aborted_connects) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- Percona Audit Log Plugin Documentation — https://docs.percona.com/percona-server/8.0/audit-log-plugin.html
- Filebeat Reference: Log input — https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-log.html

## Issues Found

1. **BEFORE SELECT trigger is invalid in MySQL (Step 4):** The post defined a `BEFORE SELECT ON credit_cards` trigger. MySQL only supports triggers on INSERT, UPDATE, and DELETE events — not SELECT. This would fail with a syntax error. Fixed by replacing with three valid triggers (AFTER INSERT, AFTER UPDATE, AFTER DELETE) and adding a note that SELECT monitoring requires the audit plugin or a proxy-layer solution. Also renamed `client_ip` column to `client_host` since `SUBSTRING_INDEX(USER(), '@', -1)` returns the host identifier, which may be a hostname rather than an IP address.

2. **Invalid Performance Schema instrument pattern (Step 6):** The post used `WHERE name LIKE 'statement/sql/error%'` to enable connection tracking instruments. No such instrument pattern exists in Performance Schema for tracking failed logins. Removed this incorrect UPDATE statement.

3. **Non-existent `total_errors` column in `performance_schema.accounts` (Step 6):** The post queried `total_errors` from `performance_schema.accounts`, but this column does not exist. That table only contains `USER`, `HOST`, `CURRENT_CONNECTIONS`, and `TOTAL_CONNECTIONS`. Replaced with a query against `performance_schema.host_cache` which has the correct columns (`COUNT_AUTH_ERRORS`, `SUM_CONNECT_ERRORS`, `COUNT_HANDSHAKE_ERRORS`, etc.) for tracking failed login attempts. Also added `SHOW GLOBAL STATUS LIKE 'Aborted_connects'` as a complementary check.

## Review Notes
- The Percona Audit Log Plugin configuration is specific to Percona Server for MySQL. Standard MySQL Community Edition does not include this plugin out of the box. The introductory note correctly calls this out.
- The Python monitoring script uses a hardcoded password in plain text (`password='pass'`). In production, credentials should be loaded from environment variables or a secrets manager. This is acceptable for a tutorial example.
- The Filebeat configuration uses the older `type: log` input. Newer Filebeat versions recommend `type: filestream`, though `type: log` still works.
