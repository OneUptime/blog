# Validation Summary: How to Use Dapr State Query API with Azure Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (State Management, Query API)
- Azure Cosmos DB (SQL API)
- Dapr Python SDK (`dapr-client`)
- Azure CLI (`az cosmosdb`)
- Kubernetes (secrets management)

## Sources Consulted
- Dapr Azure Cosmos DB State Store component spec — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr State Query API how-to — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr State Management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Python SDK source (DaprClient, QueryResponse) — https://github.com/dapr/python-sdk
- Azure CLI `az cosmosdb sql container` reference — https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Azure Cosmos DB indexing policy documentation — https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy
- Dapr components-contrib Cosmos DB query implementation — https://github.com/dapr/components-contrib/blob/main/state/azure/cosmosdb/cosmosdb_query.go

## Issues Found

### 1. Incorrect property name on query result items (Python SDK)
- **What was wrong:** The code used `item.data` to access the value of each query result item.
- **What was changed:** Changed `item.data` to `item.value`. The Dapr Python SDK's `QueryResponseItem` exposes the state data via the `.value` property, not `.data`.
- **Why:** Using `.data` would raise an `AttributeError` at runtime.

### 2. Missing `--resource-group` in Azure CLI command
- **What was wrong:** The `az cosmosdb sql container update` command was missing the required `--resource-group` parameter.
- **What was changed:** Added `--resource-group YOUR_RESOURCE_GROUP` to the command.
- **Why:** `--resource-group` is a required parameter for this Azure CLI command; omitting it causes the command to fail.

### 3. Incorrect JSON structure for indexing policy
- **What was wrong:** The composite index JSON was wrapped inside an `"indexingPolicy"` key. The `--idx` flag on `az cosmosdb sql container update` expects the indexing policy fields at the root level of the JSON object.
- **What was changed:** Removed the `"indexingPolicy"` wrapper so `"compositeIndexes"` is at the root level.
- **Why:** Passing the nested format would cause the CLI to ignore the composite index configuration or error out.

## Review Notes
- The "Supported Filter Operators" section lists 7 of the 9 Dapr query filter operators. The `NEQ` (not equal) and `LTE` (less than or equal) operators are omitted. This is not technically incorrect since the post doesn't claim to be exhaustive in its examples, but readers may find it incomplete.
- The `partitionKey` field in the component metadata YAML is not listed in the official Dapr Cosmos DB component spec. Dapr requires the Cosmos DB container to be created with `/partitionKey` as the partition key path, but this is a container-level configuration, not a Dapr component metadata field. Dapr may silently ignore unrecognized metadata fields, so this won't cause an error, but it could mislead readers into thinking it's a required component setting.
- The Dapr State Query API is currently in alpha status and subject to breaking changes in future Dapr releases.
