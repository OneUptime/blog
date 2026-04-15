# Validation Summary: How to Configure Cache TTL with Dapr State TTL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, state TTL)
- Go (Dapr Go SDK - `github.com/dapr/go-sdk/client`)
- Python (Dapr Python SDK - `dapr.clients`)
- Redis, Cosmos DB, DynamoDB (as TTL-supporting state stores)
- curl / HTTP API

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr Go SDK source (`client.SaveState` method signature): https://github.com/dapr/go-sdk
- Dapr Python SDK source (`save_state` method signature): https://github.com/dapr/python-sdk
- Dapr supported state stores reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found
1. **Incorrect consistency query parameter (line 98)**: The curl example used `?metadata.consistencyLevel=strong` which is not the correct query parameter. The `metadata.*` prefix is for store-specific metadata (e.g., `metadata.partitionKey`), not for consistency level. Fixed to `?consistency=strong` per the Dapr State API reference.

2. **Missing `encoding/json` import in Go example (line 41)**: The Go code called `json.Marshal(product)` but the import block did not include `"encoding/json"`. Added the missing import.

3. **Unused `StateItem` import in Python example (line 57)**: The Python code imported `from dapr.clients.grpc._state import StateItem` but never used `StateItem` anywhere. Removed the unused import.

## Review Notes
- The claim about `metadata.ttlExpireTime` being returned in response headers on state reads is based on a real feature (added in Dapr runtime via PR #6827) but is not prominently documented in the official API reference page. This is technically correct but readers may have difficulty finding official documentation for it.
- The TTL auto-deletion behavior is store-dependent. For stores with native TTL support (Redis, DynamoDB), the store handles expiration directly. For SQL-based stores (PostgreSQL, MySQL, SQLite), Dapr hides expired entries from reads immediately but uses a periodic background garbage collector to physically delete them. The blog's simplified explanation is acceptable for a tutorial but readers should be aware of this nuance.
- The Python SDK `save_state` has both `state_metadata` (for state-level metadata like TTL) and `metadata` (for gRPC custom metadata). The blog correctly uses `state_metadata`.
- TTL values must be strings (e.g., `"300"` not `300`) in the metadata map. The blog correctly uses string values throughout.
