# Validation Summary: How to Enable and Use Azure Storage Analytics Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Storage
- Azure Blob Storage metrics
- Azure Monitor metrics and metric alerts
- Azure CLI
- Azure Monitor Workbooks
- Azure Monitor Query SDK for Python
- pandas

## Sources Consulted
- Microsoft Learn: Monitor Azure Table Storage - https://learn.microsoft.com/en-us/azure/storage/tables/monitor-table-storage
- Microsoft Learn: Azure Blob Storage Monitoring Metrics and Logs Reference - https://learn.microsoft.com/en-us/azure/storage/blobs/monitor-blob-storage-reference
- Microsoft Learn: Transition to metrics in Azure Monitor - https://learn.microsoft.com/en-us/azure/storage/common/storage-metrics-migration
- Microsoft Learn: Azure Monitor Metrics overview - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-platform-metrics
- Microsoft Learn: az monitor metrics CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: az storage metrics CLI reference - https://learn.microsoft.com/en-us/cli/azure/storage/metrics
- Microsoft Learn: MetricsQueryClient Python API reference - https://learn.microsoft.com/en-us/python/api/azure-monitor-query/azure.monitor.query.metricsqueryclient
- Microsoft Learn: Azure Workbooks samples and ARM template guidance - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-samples and https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-automate

## Issues Found
- Classic Storage Analytics metrics were described as "being retired" and still useful for legacy tooling. Updated this to state that classic metrics retired on January 9, 2024 and that legacy tooling should migrate to Azure Monitor metrics.
- Azure Monitor metrics were described as enabled by default for all storage accounts. Clarified that Azure Monitor metrics apply to Azure Resource Manager storage accounts.
- The classic metrics section showed how to enable retired classic metrics. Changed it to a migration-oriented section that shows how to review legacy settings with `az storage metrics show`.
- The Transactions dimensions list omitted `TransactionType`. Added it based on the Azure Blob Storage monitoring data reference.
- Capacity metrics were described as emitted once per day. Updated this to hourly, with Blob Capacity and Blob Count computed by a background process multiple times per day.
- The Azure Monitor workbook JSON snippet used a simplified shape that does not match exported workbook JSON or ARM template usage. Replaced it with accurate workbook editor guidance and a note to export reusable templates from the portal.
- The Python SDK example used `dimension_filter`, which is not a valid `MetricsQueryClient.query_resource` keyword. Changed it to `filter`.
- The pandas capacity-planning example used `[100, 101, 102, ...]`, which is not a usable numeric series for the calculation. Replaced it with a generated 31-day numeric list matching the date range.
- The closing sentence referred to "Storage Analytics metrics" generically. Changed it to "Azure Storage metrics" to avoid implying the retired classic metrics system.

## Review Notes
The local environment does not have Azure CLI or pandas installed, so CLI checks were performed against current Microsoft Learn CLI references rather than local `az --help` output, and the pandas sample was reviewed statically. The post still focuses on Azure Monitor metrics, which is the correct current platform; future edits could consider retitling the post to avoid implying that retired classic Storage Analytics metrics should be enabled for new setups.
