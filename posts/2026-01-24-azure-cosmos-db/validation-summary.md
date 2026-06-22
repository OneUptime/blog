# Validation Summary: How to Handle Azure Cosmos DB

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure CLI
- Azure Cosmos DB JavaScript SDK (`@azure/cosmos`)
- Azure Cosmos DB .NET SDK (`Microsoft.Azure.Cosmos`)
- Cosmos DB indexing policies, partitioning, throughput, TTL, bulk operations, and change feed
- Azure Monitor Log Analytics / Kusto Query Language

## Sources Consulted
- Azure Cosmos DB JavaScript SDK overview: https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme
- Azure Cosmos DB JavaScript `Items` API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/items
- Azure Cosmos DB JavaScript bulk operations guide: https://learn.microsoft.com/en-us/azure/cosmos-db/bulk-executor-nodejs
- Azure Cosmos DB change feed pull model: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-pull-model
- Azure Cosmos DB change feed processor: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-processor
- Azure CLI `az cosmosdb sql container` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Azure CLI `az cosmosdb sql container throughput` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container/throughput
- Azure Cosmos DB request units documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/request-units
- Azure Cosmos DB partitioning documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning
- Azure Cosmos DB indexing policy documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy

## Issues Found
- The JavaScript bulk insert example used `container.items.bulk()`, which the current `@azure/cosmos` API reference marks as deprecated. Updated it to `container.items.executeBulkOperations()`.
- The bulk insert example omitted the operation-level `partitionKey`. Current Microsoft examples explicitly include `partitionKey` for bulk operations, so the sample now passes `order.customerId`.
- The bulk response parsing read `r.requestCharge`, but current bulk operation results expose the request charge under each successful operation's `response.requestCharge`. Updated the reduction accordingly and made it tolerant of failed operation results.
- The JavaScript change feed example used the deprecated `container.items.changeFeed()` API and `fetchNext()`. Updated it to the current pull-model API, `container.items.getChangeFeedIterator()` with `ChangeFeedStartFrom.Now()`, and `readNext()`.
- The JavaScript SDK import only imported `CosmosClient`; it now also imports `BulkOperationType` and `ChangeFeedStartFrom`, which are used by the corrected examples.

## Review Notes
The post is accurate as a practical overview. The Azure CLI examples and core Cosmos DB concepts checked out against current Microsoft documentation. One future improvement would be to note that the change feed processor is available for .NET and Java SDKs, while Node.js uses the pull model with manual continuation-token handling.
