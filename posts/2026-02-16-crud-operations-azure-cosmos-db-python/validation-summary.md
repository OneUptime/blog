# Validation Summary: How to Perform CRUD Operations on Azure Cosmos DB Using azure-cosmos SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- azure-cosmos Python SDK
- azure-identity Python SDK
- Azure CLI
- Microsoft Entra ID authentication
- Cosmos DB native data-plane RBAC

## Sources Consulted
- Microsoft Learn: Azure Cosmos DB SQL API client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/cosmos-readme
- Microsoft Learn: azure.cosmos.ContainerProxy class - https://learn.microsoft.com/en-us/python/api/azure-cosmos/azure.cosmos.containerproxy
- Microsoft Learn: azure.cosmos.database.DatabaseProxy class - https://learn.microsoft.com/en-us/python/api/azure-cosmos/azure.cosmos.database.databaseproxy
- Microsoft Learn: az cosmosdb CLI reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: az cosmosdb sql role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/role/assignment
- Microsoft Learn: Azure Cosmos DB data plane security reference - https://learn.microsoft.com/en-us/azure/cosmos-db/reference-data-plane-security
- Microsoft Learn: Connect using role-based access control and Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-connect-role-based-access-control

## Issues Found
- Updated terminology from "SQL (Core) API" and "Azure AD" to "API for NoSQL" and "Microsoft Entra ID" while retaining the former SQL/Core name for clarity.
- Replaced the container partition key dictionary with `PartitionKey(path="/category")`, which matches the current Python SDK documentation for `create_container_if_not_exists`.
- Corrected the single-partition query example to pass `partition_key="electronics"` instead of `enable_cross_partition_query=False`; the current SDK documents `enable_cross_partition_query` as `None` or `True`, and scoped queries should specify the partition key.
- Added `partition_key="electronics"` to the delete-by-query example so the query satisfies the SDK requirement to specify either a partition key or enable cross-partition query.
- Replaced the outdated Python bulk-operation guidance with a note that the Python SDK does not currently implement bulk requests.
- Corrected the ETag concurrency example to use `etag` and `MatchConditions.IfNotModified`, and to catch `CosmosHttpResponseError`, matching the current `replace_item` API.
- Updated the RU-charge example to read headers through `get_response_headers()` on the point-operation response instead of using `container.client_connection.last_response_headers`.
- Removed an unused `PartitionKey` import from the patch example.

## Review Notes
The Azure CLI was not installed in the local environment, and the azure-cosmos package was not installed locally, so command/API verification was performed against current official Microsoft documentation rather than local execution.
