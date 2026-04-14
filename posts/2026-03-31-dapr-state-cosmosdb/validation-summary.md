# Validation Summary: How to Use Dapr State Management with Azure Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management component)
- Azure Cosmos DB (Core/SQL API)
- Azure CLI
- Dapr Python SDK (`dapr-python-sdk`)
- Dapr Go SDK (`dapr/go-sdk`)
- Azure Managed Identity
- Dapr HTTP API

## Sources Consulted
- Dapr state management component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Python SDK source and API (`DaprClient.save_state`, `StateOptions`, `Concurrency`): https://github.com/dapr/python-sdk
- Dapr Go SDK source and API (`client.SaveState`, `client.GetState`): https://github.com/dapr/go-sdk
- Azure CLI Cosmos DB commands: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure Cosmos DB system properties documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/resource-model
- Dapr state store consistency options: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/

## Issues Found

### 1. Incorrect document structure example
**What was wrong:** The stored Cosmos DB document example showed `"etag"` as a field name and included a non-existent `"ttlAttributeName": "_ts"` field. Cosmos DB uses `_etag` as a system property (prefixed with underscore). The `ttlAttributeName` field is not part of the Dapr Cosmos DB document schema.

**What was changed:** Replaced `"etag"` with `"_etag"` and replaced `"ttlAttributeName": "_ts"` with `"_ts": 1617000000` to accurately reflect Cosmos DB system properties.

### 2. Python SDK optimistic concurrency — incorrect API usage
**What was wrong:** The `save_state` call passed `options={"concurrency": "first-write", "etag": result.etag}` — a raw dict with `etag` nested inside. The Dapr Python SDK requires `options` to be a `StateOptions` object (not a dict), and `etag` is a separate top-level parameter on `save_state`, not nested inside `options`.

**What was changed:** Added import for `StateOptions` and `Concurrency` from `dapr.clients.grpc._state`. Changed the `save_state` call to pass `etag=result.etag` as a separate parameter and `options=StateOptions(concurrency=Concurrency.first_write)` as the proper object.

### 3. Consistency section — incorrect Python SDK usage
**What was wrong:** The section showed `state_metadata={"consistency": "strong"}` passed to `get_state` in the Python SDK. The `state_metadata` parameter maps to component-level metadata in the gRPC request, not the `consistency` field on the state request. This would silently fail to set the desired consistency level.

**What was changed:** Replaced the Python SDK example with the Dapr HTTP API approach (`?consistency=strong` query parameter), which is the correct and unambiguous way to set per-request consistency. Added clarification that these are Dapr-level consistency options, separate from the Cosmos DB account-level consistency setting.

## Review Notes
- The Azure CLI commands, component YAML configuration, Dapr HTTP API calls, Go SDK example, managed identity configuration, and secret store references are all correct.
- The `Core/SQL API` terminology in prerequisites is correct but Azure has been transitioning to calling this the "NoSQL API" — the CLI commands still work the same way.
- The Go SDK example correctly uses the `SaveState` and `GetState` signatures with the proper parameter types.
- The partition key behavior description (app ID as default partition key, `||` separator in document IDs, `keyPrefix` customization) is accurate per Dapr documentation.
- The "Cosmos DB Built-in Data Contributor" role mentioned for managed identity is the correct role for data plane access.
