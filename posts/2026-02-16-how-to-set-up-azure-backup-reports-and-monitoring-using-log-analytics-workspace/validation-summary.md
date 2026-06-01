# Validation Summary: How to Set Up Azure Backup Reports and Monitoring Using Log Analytics Workspace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Recovery Services vaults
- Log Analytics workspace
- Azure Monitor diagnostic settings
- Azure Monitor scheduled query alerts
- Azure Backup Reports
- Kusto Query Language (KQL)
- Azure CLI

## Sources Consulted
- Azure Backup diagnostic events: https://learn.microsoft.com/en-us/azure/backup/backup-azure-diagnostic-events
- Configure Azure Backup reports: https://learn.microsoft.com/en-us/azure/backup/configure-reports
- View Azure Backup reports: https://learn.microsoft.com/en-us/azure/backup/view-reports
- Azure CLI diagnostic settings reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI scheduled query alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure CLI Log Analytics workspace reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Azure CLI Log Analytics data export reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/data-export
- Azure Monitor Logs table reference for AddonAzureBackupJobs: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/addonazurebackupjobs
- Azure Monitor Logs table reference for CoreAzureBackup: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/coreazurebackup
- Azure Monitor Logs table reference for AddonAzureBackupStorage: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/addonazurebackupstorage

## Issues Found
- Diagnostic settings examples said to use resource-specific mode but did not pass `--export-to-resource-specific true`. Added the flag so the data lands in resource-specific tables such as `CoreAzureBackup` and `AddonAzureBackupJobs`.
- Diagnostic settings examples selected `AddonAzureBackupAlerts`, which Microsoft now identifies as tied to the classic alerts solution on a deprecation path. Replaced it with the supported `AzureBackupOperations` category.
- Backup Reports access instructions used an older vault-menu path. Updated the steps to the current Azure portal path through **Resiliency** > **Monitoring + Reporting** > **Reports** > **Backup Reports**.
- Several KQL examples did not deduplicate job records before filtering or counting by status. Added `summarize arg_max(TimeGenerated, *) by JobUniqueId` where needed, matching the official Azure Monitor sample query pattern.
- The backup duration query referenced `JobEndDateTime`, which is not a column in the `AddonAzureBackupJobs` table. Changed it to use the documented `JobDurationInSecs` field.
- Scheduled query alert commands used an invalid `--condition "count > 0"` form. Updated them to use named query placeholders in both `--condition` and `--condition-query`, matching the Azure CLI syntax.
- The Log Analytics data export command used `--table-names`, which is not the current Azure CLI parameter. Changed it to `--tables`.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft Learn CLI references rather than local `az --help` output. The post remains focused on Recovery Services vaults; Azure Backup also has Backup vault coverage, but expanding scope was outside this correction-only review.
