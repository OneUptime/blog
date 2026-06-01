# Validation Summary: How to Fix Throttling (429 Too Many Requests) Errors in Azure Cosmos DB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Monitor metrics and alerts
- Azure CLI
- Kusto Query Language (KQL)
- Azure Cosmos DB Python SDK
- Azure Cosmos DB .NET SDK

## Sources Consulted
- Microsoft Learn: Diagnose and troubleshoot "Request rate too large" (429) exceptions - https://learn.microsoft.com/en-us/azure/cosmos-db/troubleshoot-request-rate-too-large
- Microsoft Learn: Monitor normalized request units in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-normalized-request-units
- Microsoft Learn: Azure Cosmos DB monitoring data reference - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference
- Microsoft Learn: Azure Monitor Logs reference: CDBDataPlaneRequests - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/cdbdataplanerequests
- Microsoft Learn: Redistribute throughput across partitions - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-redistribute-throughput-across-partitions
- Microsoft Learn: Find request unit charge in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/find-request-unit-charge
- Microsoft Learn: Get SQL query execution metrics with Python SDK - https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query-metrics-performance-python
- Microsoft Learn: Azure CLI `az cosmosdb sql container throughput` - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container/throughput
- Microsoft Learn: Azure CLI `az monitor metrics` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Azure CLI `az monitor metrics alert` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: CosmosClientOptions retry properties - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.cosmosclientoptions.maxretryattemptsonratelimitedrequests
- Microsoft Learn: Autoscale throughput FAQ - https://learn.microsoft.com/en-us/azure/cosmos-db/autoscale-faq

## Issues Found
- The Azure Monitor CLI metrics example used `ThrottledRequests`, which is a legacy Cosmos DB metrics API name rather than the current Azure Monitor metric. Changed the command to query `TotalRequests` and `TotalRequestUnits`, with `StatusCode` dimension filtering.
- The hot partition example said the other partitions had 9,000 RU/s unused when 10,000 RU/s across five partitions leaves 8,000 RU/s outside the hot partition. Corrected the arithmetic.
- The KQL hot partition query referenced `PartitionKeyRangeId` in `CDBDataPlaneRequests`, but that table exposes `PartitionId`; current Cosmos DB diagnostics guidance uses `CDBPartitionKeyRUConsumption` with `PartitionKeyRangeId` for partition-key RU analysis. Replaced the query with the documented table and fields.
- The partition key recommendation referred to a "composite key"; Azure Cosmos DB documentation uses "synthetic partition key" for combining values into one partition key. Updated the wording.
- The metric alert command used `--action-group`, which is not a current `az monitor metrics alert create` parameter. Changed it to `--action`.

## Review Notes
The rest of the post's Cosmos DB 429 behavior, SDK retry defaults, RU charge access pattern, autoscale range, throughput update commands, and partition-key migration guidance match current Microsoft documentation. The examples assume the reader has enabled the relevant diagnostic log categories before running the KQL queries.
