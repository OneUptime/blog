# Validation Summary: How to Design an Effective Partition Key Strategy in Azure Cosmos DB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB partition keys and logical/physical partitions
- Azure Cosmos DB hierarchical partition keys
- Azure Cosmos DB .NET SDK
- Azure CLI
- Python
- JSON/JSONC

## Sources Consulted
- Microsoft Learn: Partitioning and horizontal scaling in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview
- Microsoft Learn: Hierarchical partition keys in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/hierarchical-partition-keys
- Microsoft Learn: Create a synthetic partition key - https://learn.microsoft.com/en-us/azure/cosmos-db/synthetic-partition-keys
- Microsoft Learn: Service quotas and default limits in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits
- Microsoft Learn: Monitor normalized request units in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-normalized-request-units
- Microsoft Learn: Monitor and debug with insights in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/use-metrics
- Microsoft Learn: Azure CLI az cosmosdb sql container reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container

## Issues Found
- The JSON snippets used comments and placeholder ellipses while being marked as `json`. Changed those code fences to `jsonc` so the examples are not presented as strict JSON.
- The synthetic key section said a `deviceId_date` key aligns with queries that filter by device and date range. A synthetic key can route efficiently only when the full synthetic key value is known; changed this to "device and a specific date."
- The hierarchical partition key section said queries are efficient "at any level of the hierarchy." Microsoft documents efficient routing when queries specify all partition key values or a prefix of the hierarchy, not arbitrary non-prefix levels. Updated the wording and code comment to say "prefix" levels.
- The migration example described `AllowBulkExecution` as using the "bulk execution library." In the current .NET SDK, bulk execution is enabled through SDK options rather than the older separate bulk executor library. Updated the comment accordingly.

## Review Notes
- The Azure CLI command shape is consistent with the documented `az cosmosdb sql container show` command and global `--query` option. The local environment did not have `az` installed, so validation was done against Microsoft Learn rather than local CLI help.
- The migration sample is intentionally simplified. In production, batch size and concurrency should be bounded rather than accumulating every write task before awaiting.
