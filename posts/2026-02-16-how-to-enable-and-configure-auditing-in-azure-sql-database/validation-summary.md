# Validation Summary: How to Enable and Configure Auditing in Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL auditing
- Azure CLI
- Azure PowerShell
- Azure Monitor Logs / Log Analytics
- Azure Event Hubs
- Azure Storage
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Auditing for Azure SQL Database and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-overview?view=azuresql
- Microsoft Learn: Set up Auditing for Azure SQL Database and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-setup?view=azuresql
- Microsoft Learn: Auditing policy at the server and database level - https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-server-level-database-level?view=azuresql
- Microsoft Learn: Use Auditing to analyze audit logs and reports - https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-analyze-audit-logs?view=azuresql
- Microsoft Learn: SQL Database audit log format - https://learn.microsoft.com/en-us/azure/azure-sql/database/audit-log-format?view=azuresql
- Microsoft Learn: az sql server audit-policy - https://learn.microsoft.com/en-us/cli/azure/sql/server/audit-policy?view=azure-cli-lts
- Microsoft Learn: Set-AzSqlServerAudit - https://learn.microsoft.com/en-us/powershell/module/az.sql/set-azsqlserveraudit?view=azps-15.6.0
- Microsoft Learn: Manage data retention in a Log Analytics workspace - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Microsoft Learn: What is Azure Event Hubs? - https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about

## Issues Found
- The Azure CLI examples used `--server`, but `az sql server audit-policy update` uses `--name` / `-n` for the logical server name. Changed the examples to use `--name`.
- The Azure CLI storage example enabled the audit policy but did not explicitly enable the blob storage target. Added `--blob-storage-target-state Enabled`, matching the official CLI examples.
- The PowerShell example supplied a storage account without explicitly enabling the blob storage target. Added `-BlobStorageTargetState Enabled`, matching `Set-AzSqlServerAudit` examples.
- The action group configuration example used `CREATE DATABASE AUDIT SPECIFICATION`, which is SQL Server / Azure SQL Managed Instance T-SQL syntax and is not the documented Azure SQL Database auditing configuration path. Replaced it with an Azure CLI `--actions` example.
- The Log Analytics retention text said retention is configurable only up to 730 days and recommended exporting for longer retention. Updated it to distinguish 730-day analytics retention from Log Analytics long-term retention.
- The performance section stated a typical overhead of less than 5%, which is not stated in current Microsoft documentation. Replaced it with documented guidance that auditing is optimized for performance but can allow transactions to continue without recording all marked events during very high activity or network load.

## Review Notes
The KQL examples use the documented `AzureDiagnostics` table, `SQLSecurityAuditEvents` category, and documented audit field names. The article could later mention the 4,000-character audit field truncation limit and the Microsoft Entra failed-login caveat, but those are additional limitations rather than corrections required for this guide.
