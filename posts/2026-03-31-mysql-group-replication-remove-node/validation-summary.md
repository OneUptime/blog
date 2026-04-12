# Validation Summary: How to Remove a Node from MySQL Group Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Group Replication
- MySQL Performance Schema (`performance_schema.replication_group_members`)
- MySQL configuration (`my.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Group Replication: https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL 8.0 Reference Manual — `STOP GROUP_REPLICATION`: https://dev.mysql.com/doc/refman/8.0/en/stop-group-replication.html
- MySQL 8.0 Reference Manual — Group Replication System Variables (`group_replication_group_seeds`, `group_replication_member_expel_timeout`, `group_replication_ip_allowlist`): https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html
- MySQL 8.0 Reference Manual — `group_replication_set_as_primary()`: https://dev.mysql.com/doc/refman/8.0/en/group-replication-functions-for-new-primary.html
- MySQL 8.0 Reference Manual — `replication_group_members` table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html

## Issues Found
No technical issues found.

## Review Notes
- The `group_replication_member_expel_timeout` default of 5 seconds is accurate for MySQL 8.0.21+. Prior to 8.0.21, the default was 0. The post does not specify a MySQL version, but the default is correct for current supported versions.
- The `group_replication_ip_allowlist` variable was introduced in MySQL 8.0.22, replacing the older `group_replication_ip_whitelist`. The post correctly uses the modern variable name.
- All SQL syntax, column names, system variable names, and UDF calls are verified correct against official MySQL documentation.
