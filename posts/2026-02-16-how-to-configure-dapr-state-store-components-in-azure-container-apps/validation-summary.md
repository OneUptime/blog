# Validation Summary: How to Configure Dapr State Store Components in Azure Container Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Apps
- Dapr state management
- Azure Cache for Redis
- Azure Cosmos DB for NoSQL
- Azure Blob Storage
- Azure CLI
- Node.js
- Axios

## Sources Consulted
- Microsoft Learn: Dapr components in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Microsoft Learn: az containerapp env dapr-component - https://learn.microsoft.com/en-us/cli/azure/containerapp/env/dapr-component
- Microsoft Learn: az redis - https://learn.microsoft.com/en-us/cli/azure/redis
- Dapr Docs: State management API reference - https://docs.dapr.io/reference/api/state_api/
- Dapr Docs: Redis state store component - https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Docs: Azure Cosmos DB state store component - https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Docs: Azure Blob Storage state store component - https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-blobstorage/
- Dapr Docs: Supported state stores - https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Microsoft Learn: Data persistence in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence

## Issues Found
- The post used `first-write-wins` as a Dapr state API concurrency option. Dapr's HTTP state API uses `first-write` or `last-write`, so the code sample was changed to `first-write`.
- The Azure Container Apps Dapr `scopes` explanation said scopes restrict container apps by service names. Microsoft documentation specifies that scopes correspond to Dapr application IDs, so the wording was corrected.
- The transaction section implied Redis and Cosmos DB transactions work the same without caveats. Cosmos DB transactions must target the same partition, so the explanation and sample request now include transaction metadata with a shared `partitionKey`.
- The Azure Blob Storage state store example used component `version: v1`. Dapr recommends `v2` for new Azure Blob Storage state store components, so the example was updated to `version: v2`.
- The troubleshooting section said to use Standard or Premium Redis for persistence. Azure Cache for Redis data persistence is available for Premium and Enterprise tiers, not Basic or Standard, so the guidance was corrected.

## Review Notes
Azure Cache for Redis has an announced retirement timeline and Microsoft recommends moving to Azure Managed Redis. The existing Azure Cache for Redis CLI examples are still documented, so the post remains technically valid, but a future update could modernize the Redis provisioning path.
