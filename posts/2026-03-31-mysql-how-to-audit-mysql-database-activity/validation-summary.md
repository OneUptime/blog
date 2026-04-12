# Validation Summary: How to Audit MySQL Database Activity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (General Query Log, Enterprise Audit Plugin, Performance Schema)
- Percona Server (Audit Log Plugin)
- SQL triggers and JSON functions
- rsyslog (centralized log shipping)

## Sources Consulted
- MySQL 8.0 Reference Manual: General Query Log — https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual: MySQL Enterprise Audit — https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual: audit_log_policy system variable — https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual: Performance Schema summary tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: host_cache table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-host-cache-table.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: JSON_OBJECT() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- Percona Server Documentation: Audit Log Plugin — https://docs.percona.com/percona-server/8.0/audit-log-plugin.html

## Issues Found

1. **Percona section was misleading about MySQL Community Edition compatibility**: The post stated "For MySQL Community Edition, use the Percona Audit Log plugin" implying the plugin can be added to an existing MySQL CE installation. In reality, `apt-get install percona-server-server` replaces MySQL entirely with Percona Server. The Percona audit plugin is not a standalone add-on for vanilla MySQL CE. Fixed by clarifying that Percona Server is a drop-in replacement for MySQL CE and that the audit plugin is a built-in feature of Percona Server.

2. **Performance Schema query description was inaccurate**: The text said "Track connection attempts and failures" before a query on `performance_schema.events_statements_summary_by_account_by_event_name`. This table tracks statement execution statistics (queries run per account), not connection/login attempts. Changed the description to "Track query activity by account" which accurately describes what the table reports.

## Review Notes
- The `audit_log_policy` variable shown in Option 2 is deprecated as of MySQL 8.0.34 in favor of rule-based audit log filtering. It still functions but new deployments should consider using `audit_log_filter_set_filter()` and `audit_log_filter_set_user()` for more granular control.
- The expression default syntax `DEFAULT (USER())` in the trigger-based audit table requires MySQL 8.0.13 or later.
- The `JSON` value for `audit_log_format` requires MySQL 8.0.12 or later.
- All SQL syntax, configuration directives, and CLI commands are correct for modern MySQL 8.0+ deployments.
