# Validation Summary: How to Use Dapr with Azure Cosmos DB for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management, `state.mongodb` component)
- Azure Cosmos DB for MongoDB API
- Azure CLI (`az cosmosdb` commands)
- Kubernetes (secrets)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr MongoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/
- Dapr state management how-to guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr SDK serialization documentation: https://docs.dapr.io/developing-applications/local-development/sdk-serialization/
- Azure CLI `az cosmosdb` command reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure CLI `az cosmosdb mongodb collection throughput` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/mongodb/collection/throughput

## Issues Found

1. **Incorrect comment for shard key (line 63)**: The comment said "with /id as partition key" but the actual shard key used in the command is `_id`. The `/id` notation is Cosmos DB SQL API partition key path syntax, not MongoDB API. Fixed the comment to "with _id as shard key".

2. **Autoscale throughput command incomplete (lines 133-139)**: The comment said "Enable autoscale" but the command `az cosmosdb mongodb collection throughput update --max-throughput 4000` only updates the max throughput for a collection that is already in autoscale mode. Since the collection was created earlier in the post with default manual throughput, this command would fail. Added the required `az cosmosdb mongodb collection throughput migrate --throughput-type autoscale` command before the `throughput update` command.

3. **Double-serialization in JavaScript example (line 113)**: The `state.save` call wrapped the value in `JSON.stringify()`, but the Dapr JavaScript SDK automatically serializes values to JSON. This would cause double-serialization, storing a JSON string literal instead of the intended object. Removed the `JSON.stringify()` wrapper so the object is passed directly.

## Review Notes
- The Dapr MongoDB state store component accepts either `host` or `server` as the metadata field name (they are mutually exclusive). The post uses `host`, which is valid.
- The `params` metadata field includes a leading `?`, which is the correct format per Dapr documentation examples.
- The multi-region endpoint hostnames (e.g., `my-cosmos-eastus.mongo.cosmos.azure.com`) are illustrative. Actual regional endpoint formats may vary depending on account configuration.
- The JavaScript example uses top-level `await`, which requires Node.js ES modules or an async wrapper function. This is a common convention in tutorial snippets.
