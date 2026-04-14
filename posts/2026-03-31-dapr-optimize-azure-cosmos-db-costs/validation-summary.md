# Validation Summary: How to Optimize Azure Cosmos DB Costs with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management building block)
- Azure Cosmos DB (SQL API)
- Azure CLI (`az cosmosdb`, `az monitor`)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr state store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Azure Cosmos DB autoscale FAQ: https://learn.microsoft.com/en-us/azure/cosmos-db/autoscale-faq
- Azure CLI `az cosmosdb` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure CLI `az cosmosdb sql database throughput` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/database/throughput

## Issues Found
1. **Incorrect autoscale scaling range description**: The post stated autoscale "scales between 10-100x of the minimum RU/s automatically." This is incorrect. Cosmos DB autoscale scales between 10% and 100% of the configured **max** RU/s (i.e., from Tmax/10 to Tmax). With `--max-throughput 10000`, the system scales between 1,000 and 10,000 RU/s. Fixed the description to: "automatically scale between 10% and 100% of the configured max RU/s."

## Review Notes
- The `partitionKey` field shown in the Dapr component metadata spec (lines 39-40) is not listed as a standard component-level metadata field in the official Dapr docs. The recognized fields are `url`, `masterKey`, `database`, `collection`, and `actorStateStore`. The `partitionKey` is a per-request metadata field passed during individual state operations, not a component configuration field. Including it in the component spec would likely be ignored by Dapr but could mislead readers.
- The `defaultDocumentTimeToLiveInSeconds` field (line 75) is not a documented Dapr component metadata field. Container-level TTL should be configured directly on the Cosmos DB container in Azure (e.g., via `--ttl` flag on `az cosmosdb sql container create`), not through the Dapr component spec. The per-item `ttlInSeconds` metadata shown in the application code example is correct.
- The `az cosmosdb sql database throughput update --max-throughput` command works only on databases already configured for autoscale. To migrate from manual to autoscale throughput, users would first need `az cosmosdb sql database throughput migrate --throughput-type autoscale`. The blog does not mention this prerequisite.
- The serverless and autoscale sections use the same account name (`my-dapr-cosmos`) but represent mutually exclusive approaches — serverless accounts do not support provisioned throughput or autoscale. Readers should understand these are alternative strategies, not sequential steps.
