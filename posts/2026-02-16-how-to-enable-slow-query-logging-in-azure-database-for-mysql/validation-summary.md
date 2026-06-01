# Validation Summary: How to Enable Slow Query Logging in Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics and Kusto Query Language (KQL)
- MySQL slow query log
- MySQL EXPLAIN and EXPLAIN ANALYZE

## Sources Consulted
- Microsoft Learn: Monitor Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql
- Microsoft Learn: CLI script to configure slow query logs: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/scripts/sample-cli-slow-query-logs
- Microsoft Learn: Azure Monitor Logs reference for MySqlSlowLogs: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/mysqlslowlogs
- Microsoft Learn: az monitor diagnostic-settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: az monitor scheduled-query CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- MySQL 8.0 Reference Manual: The Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement and EXPLAIN ANALYZE: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: SHOW PROFILE Statement: https://dev.mysql.com/doc/refman/8.0/en/show-profile.html
- Microsoft Learn: Query Performance Insight for Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/tutorial-query-performance-insights

## Issues Found
- The post claimed all slow-query parameters take effect immediately. Microsoft documents that `long_query_time` applies to newly established connections, so I updated the note to recommend reconnecting sessions or restarting when existing connections must pick up the new value.
- The diagnostic settings example used the default Log Analytics destination shape while the KQL examples needed stable current fields. I added `--export-to-resource-specific true`, removed the Log Analytics retention policy from the logs JSON, and added the matching portal instruction.
- The KQL examples used legacy/incorrect field names such as `rows_examined_d`, `rows_sent_d`, and `sql_text_s`. I updated them to query the current `MySqlSlowLogs` resource-specific table with `QueryDurationMs`, `LockDurationMs`, `RowsExamined`, `RowsSent`, and `SqlText`.
- The verification step used `SET profiling`, `SHOW PROFILES`, and `SHOW PROFILE`, which are deprecated in MySQL 8.0. I replaced them with `EXPLAIN ANALYZE` and noted the MySQL 8.0.18+ requirement.
- The scheduled-query alert command put the raw query directly in `--condition` and passed an unnamed `--condition-query`. I updated it to use a named query placeholder, matching the current Azure CLI syntax.
- The best-practices section referred to Query Store, which is not the Azure Database for MySQL feature covered by Microsoft documentation. I changed it to Query Performance Insight workbooks.
- The production best-practice recommendation was overly absolute. I adjusted it to account for log volume and overhead tradeoffs while preserving the author's operational guidance.

## Review Notes
- The Azure CLI executable was not installed in the local workspace, so CLI syntax was checked against Microsoft Learn rather than local `az --help` output.
- The post now uses resource-specific Log Analytics tables. If a reader intentionally uses the default `AzureDiagnostics` destination instead, they need the legacy column names documented for that destination.
