# Validation Summary: How to Monitor and Diagnose Azure Cosmos DB Performance with Metrics and Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB
- Azure Monitor metrics
- Azure Monitor diagnostic settings
- Log Analytics and Kusto Query Language (KQL)
- Azure CLI
- Azure Cosmos DB .NET SDK

## Sources Consulted
- Azure Cosmos DB monitoring data reference: https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference
- Monitor normalized request units in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-normalized-request-units
- Monitor Azure Cosmos DB data using Azure Monitor Log Analytics diagnostic settings: https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-resource-logs
- Azure CLI `az monitor diagnostic-settings create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Monitor Logs table reference for `CDBDataPlaneRequests`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/cdbdataplanerequests
- Azure Monitor Logs table reference for `CDBPartitionKeyRUConsumption`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/cdbpartitionkeyruconsumption
- Azure Monitor Logs table reference for `CDBQueryRuntimeStatistics`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/cdbqueryruntimestatistics
- Azure Cosmos DB diagnostic query examples: https://learn.microsoft.com/en-us/azure/cosmos-db/diagnostic-queries
- Azure Cosmos DB .NET SDK query metrics documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/query-metrics-performance
- Azure Cosmos DB indexing metrics documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/index-metrics
- .NET SDK `QueryRequestOptions.PopulateIndexMetrics` reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.queryrequestoptions.populateindexmetrics
- .NET SDK `FeedResponse<T>.IndexMetrics` reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.feedresponse-1.indexmetrics

## Issues Found
- The post described Normalized RU Consumption as normalized across all partitions and implied a 100% spike always means throttling. Updated it to reflect Azure's current definition: it is the maximum utilization across partition key ranges, and throttling occurs when requests continue to target a saturated partition key range.
- The post said Total Request Units directly maps to the bill. Updated this to "capacity usage and cost trends" because Cosmos DB billing depends on the throughput/capacity model, not only consumed RUs.
- The post used the deprecated `ServerSideLatency` metric and described percentile monitoring through Azure Monitor metrics. Updated latency guidance and the alert example to use `ServerSideLatencyDirect`; retained percentile analysis in KQL using diagnostic-log `DurationMs`.
- The diagnostic-settings CLI example included Log Analytics retention policy settings and metric export. Removed those fields and added `--export-to-resource-specific true`, matching current Cosmos DB diagnostic-settings guidance.
- The Azure CLI alert examples used `--action-group`, which is not the current `az monitor metrics alert create` parameter. Replaced it with `--action`.
- The throttling alert used `count TotalRequests`. Changed it to `total TotalRequests`, which better matches Azure Monitor metric-alert aggregation for request counts.
- The .NET query diagnostics example read index metrics from the response header. Updated it to use `FeedResponse<T>.IndexMetrics`, which is the .NET SDK v3 API exposed when `PopulateIndexMetrics` is enabled.
- The `QueryRuntimeStatistics` and `PartitionKeyStatistics` descriptions overstated the fields exposed by the current resource-specific tables. Updated those descriptions to match the current Azure Monitor table references.
- The "most expensive queries" KQL example grouped by resource ID and client IP rather than query text. Updated it to join `CDBDataPlaneRequests` with `CDBQueryRuntimeStatistics` on `ActivityId` and summarize by `QueryText`.

## Review Notes
The Azure CLI executable was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
