# Validation Summary: How to Implement Event Store with Dapr and Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, Go SDK)
- Azure Cosmos DB (state store backend)
- Go (programming language)
- Event Sourcing (architectural pattern)

## Sources Consulted
- Dapr Azure Cosmos DB state store component docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK source (state.go, client.go): https://github.com/dapr/go-sdk/blob/main/client/state.go
- Dapr supported state stores (transaction support matrix): https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Azure Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels

## Issues Found

1. **`consistencyLevel` not a valid Dapr component metadata field**: The YAML config included `consistencyLevel: Strong` and `contentType: application/json` as Dapr component metadata. Neither is a documented metadata field for the Cosmos DB state store component. Consistency level is configured at the Azure Cosmos DB account level in the Azure portal, not in the Dapr component YAML. Removed both fields and added a note to configure consistency at the account level.

2. **`SaveStateWithETag` data parameter type mismatch**: The `data` parameter of `SaveStateWithETag` is `[]byte`, but the code passed a `DomainEvent` struct directly. Added `json.Marshal(event)` to serialize the struct before passing it.

3. **`SaveStateWithETag` options parameter type mismatch**: The variadic parameter is `...StateOption` where `StateOption` is `func(*StateOptions)`, not `*StateOptions`. The code constructed a `*StateOptions` struct and passed it directly. Changed to use the functional option helpers `dapr.WithConcurrency()` and `dapr.WithConsistency()`.

4. **Missing `encoding/json` import in ReadStream**: The `ReadStream` function uses `json.Unmarshal` but the code block did not include the `encoding/json` import. Added the import.

5. **`SetStateItem.Value` type mismatch in transaction code**: `SetStateItem.Value` is `[]byte`, but the code assigned a `DomainEvent` struct directly. Added `json.Marshal(event)` to serialize before assignment.

6. **`preferredLocations` not supported by Dapr Cosmos DB component**: The Global Distribution section used a `preferredLocations` metadata field that does not exist in the Dapr Cosmos DB state store. Removed it and simplified the config to use the account endpoint, which Cosmos DB routes automatically.

7. **Strong consistency + multi-region writes claim incorrect**: The post implied strong consistency works with multi-region writes. Azure Cosmos DB explicitly does not support strong consistency with multi-region writes — the strongest available level with multi-region writes is bounded staleness. Corrected the Global Distribution section and Summary to accurately describe this limitation.

## Review Notes
- Cosmos DB transactions are scoped to a single logical partition. All items in a transactional batch must share the same partition key. The blog's key design (aggregateType||aggregateId||sequence) means transactions across different aggregates would fail. This is not incorrect for the single-aggregate use case shown, but readers should be aware of this limitation.
- The sequential key iteration approach in `ReadStream` (incrementing sequence numbers one-by-one until a gap) works but is not efficient at scale. A Cosmos DB query using the SQL API would be more performant for large event streams, but that would require direct Cosmos DB SDK usage rather than the Dapr state API.
