# Validation Summary: How to Use Dapr State Query API with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (State Management building block, State Query API)
- MongoDB (state store backend)
- Python (Dapr Python SDK)
- Kubernetes (kubectl, component deployment)
- mongosh (MongoDB shell)

## Sources Consulted
- Dapr State Query API how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr MongoDB State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/
- Dapr Python SDK client reference: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (DaprClient.query_state): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr Python SDK QueryResponseItem source: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/_response.py
- Dapr components-contrib MongoDB implementation: https://github.com/dapr/components-contrib/blob/main/state/mongodb/mongodb.go
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found
1. **`item.data` should be `item.value`** (Basic Query section, line 93): The blog post accessed query result item data via `item.data`. The Dapr HTTP API returns a `"data"` field in its JSON response, but the Python SDK's `QueryResponseItem` maps this to the `.value` attribute (bytes). Changed `json.loads(item.data)` to `json.loads(item.value)`.

## Review Notes
- The Dapr State Query API is currently in **alpha** status (endpoint: `/v1.0-alpha1/state/<storename>/query`). The post does not mention this, which readers should be aware of as the API surface may change.
- MongoDB's query API support is confirmed via the `state.Querier` interface implementation in the components-contrib source, though the official Dapr docs primarily highlight Cosmos DB as the featured query-capable backend.
- The MongoDB document structure stores data under a `value` field (confirmed from source code), so the index paths like `value.tier` shown in the post are correct.
- All component metadata fields (host, username, password, databaseName, collectionName, writeConcern, readConcern) are valid per official docs.
- The query DSL operators (EQ, GT, IN, AND), sort format, and pagination format are all correct per the Dapr query API specification.
- The `secretKeyRef` format with `name` and `key` fields is correct for Dapr component specs.
