# Validation Summary: How to Customize Indexing Policies in Azure Cosmos DB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Cosmos DB indexing policies
- Composite indexes
- Spatial indexes
- Azure Cosmos DB .NET SDK
- Azure CLI
- SQL queries for Cosmos DB

## Sources Consulted
- Microsoft Learn: Indexing policies in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy
- Microsoft Learn: Manage indexing policies in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-indexing-policy
- Microsoft Learn: Indexing in Cosmos DB - https://learn.microsoft.com/en-us/cosmos-db/indexing
- Microsoft Learn: Overview of indexing in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/index-overview
- Microsoft Learn: Azure CLI `az cosmosdb sql container update` - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Microsoft Learn: Azure Cosmos DB .NET SDK `IndexingPolicy` class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.indexingpolicy

## Issues Found
- The post described Cosmos DB indexing as an inverted index similar to search engines. Microsoft documentation describes items as JSON trees where each property path and value are indexed, so the explanation was updated to match the official model.
- The excluded path JSON example used `comment` properties inside `excludedPaths`. Official indexing policy examples define path objects with `path`; the extra fields are not part of the documented policy schema, so they were removed.
- The include-only indexing section said only the listed paths are indexed. Microsoft documents that `id` and `_ts` are automatically indexed in consistent mode, and the partition key path is not indexed by default with the exclude-root strategy. The section was updated with those caveats.
- The composite index example used a single-property `ORDER BY` and said the query might fail without the composite index. Microsoft documents that multi-property `ORDER BY` requires a composite index, while a filter plus single-property `ORDER BY` can still succeed but may cost more RUs. The query and explanation were corrected.
- The .NET SDK example replaced the indexing policy without explicitly including the root path. Official guidance says an indexing policy must include `/*` either as an included or excluded path, so the example now adds `IncludedPath { Path = "/*" }` and preserves the `_etag` exclusion.

## Review Notes
- Azure CLI could not be checked locally because `az` is not installed in this environment; the command was verified against Microsoft Learn CLI documentation instead.
- The post remains focused on Azure Cosmos DB for NoSQL. Other Cosmos DB APIs have different indexing behavior and were not in scope.
