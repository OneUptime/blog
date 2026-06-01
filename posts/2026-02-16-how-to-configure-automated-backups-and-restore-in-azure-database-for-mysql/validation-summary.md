# Validation Summary: How to Configure Automated Backups and Restore in Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL
- mysqldump
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Backup and restore in Azure Database for MySQL Flexible Server - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore
- Microsoft Learn: Azure CLI reference for az mysql flexible-server - https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for az mysql flexible-server backup - https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/backup?view=azure-cli-latest
- Microsoft Learn: Point-in-time restore in Azure Database for MySQL Flexible Server with Azure CLI - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-restore-server-cli
- Microsoft Learn: Monitor Azure Database for MySQL Flexible Server - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql
- Microsoft Learn: Azure Database for MySQL monitor data reference - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitoring

## Issues Found
- The post described automated backups as weekly full, twice-daily differential, and five-minute transaction log backups. Current Flexible Server documentation describes snapshot backups of data files, once daily by default with configurable 12-hour or 6-hour intervals, plus transaction log backups every five minutes. Updated the text and Mermaid diagram.
- The post said backup redundancy cannot be changed after server creation. Current documentation says locally redundant backup storage can be moved to geo-redundant storage after creation, while zone-redundant to geo-redundant conversion is not supported through a simple settings change. Updated the warning.
- The geo-restore section implied restore only to the paired region and used West US 2 for an East US example. Current documentation supports geo-paired regions and other supported Azure regions for Flexible Server, with some exceptions. Updated the wording and example location.
- The geo-restore RTO claim said restores are typically under an hour for most databases. Microsoft documents the factors affecting recovery time but does not guarantee that estimate. Replaced it with the documented factors.
- The monitoring section used MySqlAuditLogs diagnostic settings as if they logged backup events. Current Azure Monitor documentation lists MySqlAuditLogs as database audit logs, and the Azure CLI exposes available backups through `az mysql flexible-server backup list`. Replaced the misleading diagnostic setting example with backup configuration and backup listing commands.
- The post used "second-level granularity" wording for PITR. Current documentation states restore to any point in time within the retention period. Updated to avoid over-specific granularity.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against the official Microsoft Learn Azure CLI reference rather than local `az --help` output.
