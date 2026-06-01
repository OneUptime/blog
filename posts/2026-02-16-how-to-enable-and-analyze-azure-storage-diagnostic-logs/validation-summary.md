# Validation Summary: How to Enable and Analyze Azure Storage Diagnostic Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage
- Azure Monitor diagnostic settings
- Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Storage Analytics classic logging
- Azure Monitor scheduled query alerts

## Sources Consulted
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Azure Monitor resource logs: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/resource-logs
- Azure resource log categories: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/logs-index
- Azure CLI `az monitor diagnostic-settings create`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI `az monitor scheduled-query create`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- StorageBlobLogs example queries: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/storagebloblogs
- StorageBlobLogs table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/storagebloblogs
- Azure Files monitoring with Azure Monitor: https://learn.microsoft.com/en-us/azure/storage/files/storage-files-monitoring
- Azure Storage Analytics logging: https://learn.microsoft.com/en-us/azure/storage/common/storage-analytics-logging
- Azure Storage Analytics log format: https://learn.microsoft.com/en-us/rest/api/storageservices/storage-analytics-log-format
- Azure CLI `az storage logging update`: https://learn.microsoft.com/en-us/cli/azure/storage/logging
- Log Analytics workspace retention: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure

## Issues Found
- The post said Azure Storage diagnostic logs capture every request. Azure Monitor resource logs and Storage Analytics logs are best-effort rather than completely lossless, so this was changed to "detailed records for most requests."
- The Azure Monitor diagnostic settings CLI examples sent logs to a workspace but did not set resource-specific mode. The later KQL examples query `StorageBlobLogs`, which requires resource-specific tables instead of the default `AzureDiagnostics` table. Added `--export-to-resource-specific true` to both diagnostic settings examples.
- The scheduled query alert command used the query directly inside `--condition` and duplicated it in `--condition-query`. The current Azure CLI syntax uses a placeholder in `--condition` and maps that placeholder in `--condition-query`. Updated the command to use `AuthFailures` as the placeholder and set `--window-size` / `--evaluation-frequency` to `5m`.
- The post said logs should appear after 5-10 minutes and later cited a 5-15 minute delay. Microsoft documentation says data can take up to 90 minutes to start flowing after a diagnostic setting is created, so both statements were updated.
- The classic Storage Analytics limitation example cited Azure Data Lake Storage Gen2 support. The official classic logging documentation states Storage Analytics logging is available for Blob, Queue, and Table services, while Azure Files logging is not supported. Updated the limitation to Azure Files logging.
- The cost section described retention beyond the default period as "usually 30 days for free tier." Current Log Analytics retention documentation states the default is 30 days for most tables, with exceptions. Updated the wording.
- The cost tips recommended data collection rules for pre-ingestion filtering. Azure Monitor diagnostic settings documentation points to ingestion-time transformations for supported tables, so the recommendation was corrected.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn CLI reference pages rather than local `az --help` output.
- The KQL examples use `StorageBlobLogs`, so they are correct for blob-service diagnostics when resource-specific mode is enabled. Other storage services use their corresponding resource-specific tables, such as `StorageFileLogs`, `StorageQueueLogs`, and `StorageTableLogs`.
