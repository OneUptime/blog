# Validation Summary: How to Use Azure Cosmos DB Change Feed with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub building blocks)
- Azure Cosmos DB (SQL API, Change Feed)
- Azure Functions (Cosmos DB trigger)
- Dapr JavaScript SDK (`@dapr/dapr` v3.x)
- Dapr .NET SDK (`Dapr.Client`)
- Azure Cosmos DB .NET SDK v3 (`Microsoft.Azure.Cosmos`)
- Azure CLI (`az cosmosdb`)

## Sources Consulted
- Dapr Cosmos DB state store component docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr state management query API for Cosmos DB: https://docs.dapr.io/developing-applications/building-blocks/state-management/query-state-store/query-cosmosdb-store/
- Dapr components-contrib Cosmos DB source (CosmosItem struct): https://github.com/dapr/components-contrib/blob/main/state/azure/cosmosdb/cosmosdb.go
- Azure Functions Cosmos DB trigger binding reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-trigger
- Azure Functions Cosmos DB extension v3-to-v4 migration guide: https://learn.microsoft.com/en-us/azure/azure-functions/migrate-cosmos-db-version-3-version-4
- Dapr JS SDK source (`@dapr/dapr` v3.6.1): DaprClient constructor and pubsub.publish API
- Azure Cosmos DB .NET SDK v3 ChangeFeedProcessorBuilder source: https://github.com/Azure/azure-cosmos-dotnet-v3
- Dapr .NET SDK DaprClient.PublishEventAsync reference

## Issues Found
1. **Incorrect Dapr state field name in JavaScript code (`doc.data` → `doc.value`)**: Dapr's Cosmos DB state store stores the state payload under a field called `value`, not `data`. Changed `const stateValue = doc.data;` to `const stateValue = doc.value;`.

2. **Incorrect Dapr state field name in C# code (`item.Data` → `item.Value`)**: Same issue in the .NET Change Feed Processor example. Changed `Value = item.Data,` to `Value = item.Value,` to match the Dapr Cosmos DB document schema.

3. **Misleading comment about filtering deletions**: The comment `// Filter for state changes (not deletions)` on the `if (!doc._ts) continue;` check was inaccurate. The `_ts` field is a system property present on all Cosmos DB documents and does not indicate deletions. In the default change feed mode ("latest version"), deletions do not appear in the change feed at all. Changed comment to `// Skip documents without expected properties`.

4. **Inaccurate claim about "all mutations" in summary**: The summary stated the change feed provides "a durable, ordered log of all mutations." By default (latest version mode), the Cosmos DB change feed captures inserts and updates only — not deletions. Changed to "all inserts and updates" for accuracy. (Deletions are only captured in the newer "all versions and deletes" mode, which is not discussed in this post.)

## Review Notes
- The Azure Functions Cosmos DB trigger configuration is correct for extension v4. The property names (`containerName`, `leaseContainerName`, `createLeaseContainerIfNotExists`) are the v4 names; readers using the older v3 extension would need the legacy names (`collectionName`, `leaseCollectionName`, etc.).
- The `feedPollDelay` of 500ms is valid but aggressive (default is 5000ms). This will increase RU consumption on the lease container. This is a reasonable choice for a tutorial showing low-latency processing but worth noting for production use.
- The C# code references undefined types `StateItem` and `StateChangeEvent`. This is acceptable for a tutorial but readers will need to define these model classes. `StateItem` should have properties matching Dapr's schema: `Id`, `Value`, `IsBinary`, `PartitionKey`, `ETag`.
- The C# code is missing `using Dapr.Client;` for the `DaprClient` type. The `using Microsoft.Azure.Cosmos;` is present, which covers `CosmosClient` and `ChangeFeedProcessor`.
- The Cosmos DB change feed "all versions and deletes" mode (GA since late 2023) would be needed for a complete audit log that includes deletions. The post does not mention this mode, which is fine for the scope of the tutorial.
- The Dapr key prefix format `{appId}||{key}` used in the filtering example is correct for the default `keyPrefix: "appid"` configuration.
