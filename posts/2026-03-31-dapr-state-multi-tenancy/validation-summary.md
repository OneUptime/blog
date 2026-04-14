# Validation Summary: How to Use Dapr State Management with Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Dapr Python SDK (`dapr-client`)
- Redis (as state store backend)
- PostgreSQL v2 (as state store backend)
- Python / Flask
- Kubernetes (Dapr component YAML)

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr state sharing and key prefix strategies: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr PostgreSQL v2 state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr component scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr component YAML schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Python SDK client reference: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (gRPC client): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py

## Issues Found

1. **`scopes` field incorrectly nested under `spec` (Strategy 2 YAML):** In both tenant component YAML examples (`acme-statestore` and `globex-statestore`), the `scopes` field was placed inside `spec`. According to the official Dapr component schema, `scopes` is a root-level field — a sibling of `apiVersion`, `kind`, `metadata`, and `spec`, not nested within `spec`. Moved `scopes` to the correct root level in both component definitions.

2. **`tableName` does not exist in PostgreSQL v2 state store (Strategy 3 YAML):** The blog used `tableName: state` as a metadata field for the `state.postgresql` v2 component. The PostgreSQL v2 state store does not have a `tableName` field. The correct field is `tablePrefix`, which sets a prefix for the table name used to store state data. Changed `tableName` to `tablePrefix`.

## Review Notes
- The Python SDK usage (`save_state`, `get_state`, `delete_state`, `DaprClient` as context manager) is correct and matches current SDK API signatures.
- The `keyPrefix: none` metadata value is correctly used and documented — it disables Dapr's automatic key prefixing so the application can manage its own prefix scheme.
- The Redis component metadata field names (`redisHost`, `redisPassword`, `redisDB`) are all correct.
- The `connectionString` field via `secretKeyRef` for PostgreSQL is correct.
- The GDPR deletion example correctly notes the key pattern difference when `keyPrefix` is set to `none`, and the `scan_iter`/`delete` approach with the redis-py library is valid.
- The tenant isolation middleware and Flask decorator pattern are syntactically correct and follow standard Flask conventions.
