# Validation Summary: How to Use Azure Cosmos DB Partitioning with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Azure Cosmos DB (SQL API)
- Azure CLI (`az cosmosdb`, `az monitor`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Azure Monitor metrics

## Sources Consulted
- [Dapr Cosmos DB State Store Component Reference](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/) — verified component type, metadata fields, and partition key behavior
- [Dapr State Management API Reference](https://docs.dapr.io/reference/api/state_api/) — verified key format (`appId||stateKey`) and request-level metadata
- [Dapr JavaScript SDK Documentation](https://docs.dapr.io/developing-applications/sdks/js/js-client/) — verified `state.save()` and `state.get()` API signatures
- [az cosmosdb sql container | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container?view=azure-cli-latest) — verified container create command flags
- [az cosmosdb sql container throughput | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container/throughput?view=azure-cli-latest) — verified throughput migrate and update commands
- [az monitor metrics | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest) — verified metrics list command flags
- [Azure Cosmos DB Monitoring Data Reference | Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference) — verified metric name `NormalizedRUConsumption` and dimensions
- [az cosmosdb update | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/cosmosdb?view=azure-cli-latest) — verified multi-region update command

## Issues Found

1. **`partitionKey` incorrectly listed as component-level metadata**: The Dapr component YAML included `partitionKey` as a metadata field. This is not a valid component-level metadata field — partition keys are specified per-operation via request-level metadata. The Cosmos DB container's partition key path is set when creating the container (which the post correctly shows in the `az` CLI command). Removed `partitionKey` from the component YAML.

2. **`consistencyLevel` incorrectly shown as Dapr component metadata**: The post showed a YAML snippet with `consistencyLevel: BoundedStaleness` as a Dapr component metadata field. This is not a valid Dapr component field. Cosmos DB consistency levels must be configured on the Cosmos DB account itself via the Azure Portal or CLI. Replaced the invalid YAML snippet with the correct `az cosmosdb update --default-consistency-level` CLI command.

3. **`--metric` flag should be `--metrics` (plural)**: In the `az monitor metrics list` command, the flag `--metric` is incorrect. The correct flag name is `--metrics` (plural). Fixed to `--metrics`.

4. **Missing `partitionKey` metadata on state get operation**: The `getUserSession` function used `client.state.get()` without providing `partitionKey` metadata. When a custom partition key is specified during save, the same partition key must be provided during get for Cosmos DB to locate the document. Added `metadata: { partitionKey: userId }` to the get call.

## Review Notes
- The `contentType` metadata field (set to `"application/json"`) works in practice but is not listed in the official Dapr documentation. Since `application/json` is the default value, it is harmless but unnecessary. Left as-is since it is not incorrect.
- The post's key format explanation (`appId||stateKey`) is accurate for the default `keyPrefix` strategy (`appid`). The post does not mention that this behavior can be changed via the `keyPrefix` component metadata field, but this omission is acceptable for the scope of the tutorial.
