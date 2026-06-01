# Validation Summary: How to Query Across Partitions Efficiently in Azure Cosmos DB

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB .NET SDK v3
- Cross-partition queries
- QueryRequestOptions
- Hierarchical partition keys
- Cosmos DB SQL query language
- C#

## Sources Consulted
- Microsoft Learn: Query performance tips for Azure Cosmos DB SDKs - https://learn.microsoft.com/en-us/azure/cosmos-db/performance-tips-query-sdk
- Microsoft Learn: SQL query metrics for Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/query-metrics
- Microsoft Learn: Hierarchical partition keys in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/hierarchical-partition-keys
- Microsoft Learn: Partitioning and horizontal scaling in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview
- Microsoft Learn: Pagination in Cosmos DB query language - https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query/pagination
- Microsoft Learn: OFFSET LIMIT in Cosmos DB query language - https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query/offset-limit
- Microsoft Learn: Indexing metrics in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/index-metrics
- Microsoft Learn: Container.GetItemQueryIterator API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.getitemqueryiterator
- Microsoft Learn: ContainerProperties API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.containerproperties
- Microsoft Learn: QueryRequestOptions.PopulateIndexMetrics API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.queryrequestoptions.populateindexmetrics
- Microsoft Learn: Headers.TryGetValue API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.headers.trygetvalue

## Issues Found
- The post said the current SDK throws unless cross-partition queries are explicitly enabled. That was true for older SDK patterns, but the Azure Cosmos DB .NET SDK v3 uses `QueryRequestOptions` without an `EnableCrossPartitionQuery` flag. Updated the section to explain that omitting `PartitionKey` allows fan-out and that options should be configured deliberately.
- The post described `MaxConcurrency = -1` as "no limit" or maximum parallelism. Microsoft documentation states that values less than zero let the SDK automatically decide the concurrency. Updated the explanation and comments.
- The post said a hierarchical partition-key query filtered only by the first key level is not a cross-partition query. Microsoft documentation classifies prefix queries such as tenant-only filters as targeted cross-partition queries routed to a subset of physical partitions. Updated the wording.
- The post described result merging as happening at the gateway. Microsoft documentation describes the SDK/query execution as summarizing and merging results across partitions. Updated the wording to avoid implying gateway mode specifically.
- The projection comparison example implied a full-query RU comparison while it reads only the first page. Updated the comment to say it compares the first returned page.
- The `OFFSET LIMIT` example comment called it efficient pagination. Microsoft documentation notes that higher offsets still load skipped results and recommends continuation tokens when possible. Updated the comment to limit the recommendation to jumping to a specific page number.

## Review Notes
The remaining C# snippets use current Azure Cosmos DB .NET SDK v3 types and methods, including `QueryDefinition`, `QueryRequestOptions`, `FeedIterator<T>`, `FeedResponse<T>`, `ContainerProperties` with hierarchical partition key paths, `PopulateIndexMetrics`, and response headers. The post is a guide rather than a complete runnable program, so examples assume surrounding setup such as a configured `Container`, model types, and required `using` directives.
