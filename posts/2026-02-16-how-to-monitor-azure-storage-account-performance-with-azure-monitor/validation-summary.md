# Validation Summary: How to Monitor Azure Storage Account Performance with Azure Monitor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Blob Storage
- Azure Monitor Metrics
- Azure Monitor diagnostic settings
- Azure Monitor metric alerts
- Log Analytics and KQL
- Azure Monitor Workbooks
- Azure CLI

## Sources Consulted
- Microsoft Learn: Supported metrics for Microsoft.Storage/storageAccounts - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn: Supported metrics for Microsoft.Storage/storageAccounts/blobServices - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-blobservices-metrics
- Microsoft Learn: Supported logs for Microsoft.Storage/storageAccounts/blobServices - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-storage-storageaccounts-blobservices-logs
- Microsoft Learn: Azure Monitor Logs reference for StorageBlobLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/storagebloblogs
- Microsoft Learn: az monitor metrics list - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: az monitor metrics alert create - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: az monitor diagnostic-settings create - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn: Scalability and performance targets for standard storage accounts - https://learn.microsoft.com/en-us/azure/storage/common/scalability-targets-standard-account
- Microsoft Learn: Optimize blob partitions - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-performance-blob-partitions
- Microsoft Learn: Troubleshoot availability issues in Azure Storage accounts - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/alerts/troubleshoot-storage-availability

## Issues Found
- The diagnostic settings example exported blob logs without `--export-to-resource-specific true`, while the later queries use the resource-specific `StorageBlobLogs` table. Added the flag so the example matches the KQL queries.
- The account-level diagnostic settings example attempted to export the `Capacity` metric category. `UsedCapacity` is not exportable through diagnostic settings for storage accounts, so the example now exports only transaction metrics and the text clarifies that capacity metrics remain available through Azure Monitor Metrics.
- The throttling metric alert used a separate `--dimension` parameter, which is not part of the `az monitor metrics alert create` command syntax. Moved the ResponseType filter into the `--condition` expression using the documented `where ResponseType includes ...` syntax.
- The capacity alert described a 5 TiB storage account limit. The default standard storage account capacity target is 5 PiB, so the text and threshold were corrected to 4 PiB for an 80% alert.
- The KQL examples compared `StorageBlobLogs.StatusCode` to numeric literals, but the column is a string. Updated the comparisons to `"403"`, `"503"`, and `"429"`.
- The performance troubleshooting note overstated that containers with millions of blobs inherently degrade performance. Reworded it to focus on naming patterns that concentrate traffic on narrow partition ranges, matching Azure Blob Storage partition guidance.
- The `UsedCapacity` description implied the same behavior for all account types. Updated it to specify standard storage accounts, since Microsoft documents different behavior for premium and Blob storage accounts.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against official Azure CLI documentation rather than local `az --help` output. The post is now technically consistent with the current Microsoft Learn documentation reviewed on 2026-06-01.
