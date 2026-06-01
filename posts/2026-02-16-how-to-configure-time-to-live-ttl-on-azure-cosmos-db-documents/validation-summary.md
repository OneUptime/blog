# Validation Summary: How to Configure Time-to-Live (TTL) on Azure Cosmos DB Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure CLI
- Azure Monitor metrics
- .NET SDK for Azure Cosmos DB
- C#

## Sources Consulted
- Azure Cosmos DB time to live overview: https://learn.microsoft.com/en-us/azure/cosmos-db/time-to-live
- Configure and manage time to live in Azure Cosmos DB for NoSQL: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-time-to-live
- Azure CLI reference for `az cosmosdb sql container`: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Azure Cosmos DB change feed documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed
- Azure Cosmos DB change feed modes: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-modes
- Azure Cosmos DB monitoring data reference: https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference
- .NET SDK `ContainerProperties.DefaultTimeToLive` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.containerproperties.defaulttimetolive

## Issues Found
- The Azure CLI examples used `--default-ttl`, but the current `az cosmosdb sql container create` and `update` documentation uses `--ttl` for the default TTL setting. Updated both commands to use `--ttl`.
- The post said TTL deletion does not consume provisioned throughput. Microsoft documents that provisioned throughput accounts use leftover RUs not consumed by user requests, while serverless accounts are charged in RUs at the same rate as delete operations. Updated the introduction, key details, and keep-in-mind section.
- The scheduled notification example tried to mutate properties on a C# anonymous object, which does not compile because anonymous object properties are read-only. Replaced it with a new anonymous object for the updated document.
- The document TTL removal example assigned the result of `ReadItemAsync<dynamic>` directly to `dynamic`. The SDK returns an `ItemResponse<T>`, so the code now reads `response.Resource` before modifying the document.
- The monitoring section described `DocumentCount` as a TTL-deleted document count. Azure Monitor documents `DocumentCount` as total document count, so the wording and command comment now describe it as a way to observe total document count trends.

## Review Notes
TTL behavior, `_ts` usage, item-level `ttl`, container `DefaultTimeToLive`, disabling TTL with `null`, `-1` semantics, query behavior for expired items, and all versions and deletes change feed behavior were checked against official Microsoft documentation and are accurate after the fixes above.
