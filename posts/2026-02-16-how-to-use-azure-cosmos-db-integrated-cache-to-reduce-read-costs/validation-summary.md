# Validation Summary: How to Use Azure Cosmos DB Integrated Cache to Reduce Read Costs

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB dedicated gateway
- Azure Cosmos DB integrated cache
- Azure CLI
- Azure Monitor metrics
- .NET, Python, and Java Azure Cosmos DB SDKs

## Sources Consulted
- Azure Cosmos DB dedicated gateway overview: https://learn.microsoft.com/en-us/azure/cosmos-db/dedicated-gateway
- Azure Cosmos DB integrated cache overview: https://learn.microsoft.com/en-us/azure/cosmos-db/integrated-cache
- Configure the Azure Cosmos DB integrated cache: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-integrated-cache
- Azure CLI `az cosmosdb service create` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/service
- .NET `DedicatedGatewayRequestOptions` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.dedicatedgatewayrequestoptions
- .NET `CosmosClient` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.cosmosclient
- Python `azure.cosmos.CosmosClient` API reference: https://learn.microsoft.com/en-us/python/api/azure-cosmos/azure.cosmos.cosmosclient
- Azure Monitor supported metrics for `Microsoft.DocumentDB/databaseAccounts`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-documentdb-databaseaccounts-metrics
- Azure Retail Prices API for Azure Cosmos DB dedicated gateway pricing: https://prices.azure.com/api/retail/prices

## Issues Found
- The post referred to the required account API as "SQL (Core) API". Updated it to "API for NoSQL (formerly SQL/Core API)" to match current Azure Cosmos DB terminology.
- The dedicated gateway cache size table listed lower cache capacities than the official guidance. Updated the table to reflect that the integrated cache uses approximately 50% of node memory.
- The cache bypass example used `MaxIntegratedCacheStaleness = TimeSpan.Zero`. Updated it to use `BypassIntegratedCache = true`, which is the explicit .NET SDK option for bypassing the integrated cache without populating it.
- The query cache description only mentioned query text and parameters. Updated it to include result-affecting request options, matching Azure documentation.
- The RU savings sample calculated saved RUs incorrectly. Updated it to estimate avoided RUs from cache hits using the average RU charge from cache misses.
- The Azure Monitor metric name used incorrect casing (`DedicatedGatewayAverageCpuUsage`) and referenced a non-current max CPU metric name. Updated the examples to `DedicatedGatewayAverageCPUUsage`, `DedicatedGatewayMaximumCPUUsage`, and added the integrated cache hit-rate metrics.
- The cost analysis presented fixed monthly costs and a breakeven formula without distinguishing billing models. Updated the numbers to current East US retail examples, noted regional variation, and clarified that the consumed-RU breakeven model applies to serverless while provisioned/autoscale savings depend on reducing provisioned capacity.
- The post described write-heavy workloads as less effective because "the cache is read-only." Removed that phrase because the integrated cache is documented as read-through/write-through, although it is still primarily useful for read-heavy workloads.

## Review Notes
The Azure CLI was not installed locally, so command validation used the official Azure CLI reference instead of local `az --help`. The post is technically valid after the fixes above. Future maintenance should re-check pricing because Azure retail prices are region-specific and can change.
