# Validation Summary: How to Use State Management with Different Backend Stores

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr State Management API
- Redis (state store component)
- PostgreSQL v2 (state store component)
- Azure Cosmos DB (state store component)
- AWS DynamoDB (state store component)
- MongoDB (state store component)
- Python Dapr SDK
- Kubernetes (component deployment)

## Sources Consulted
- Dapr Redis state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL v2 state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Azure Cosmos DB state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr AWS DynamoDB state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr MongoDB state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/
- Dapr supported state stores feature comparison: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found

1. **PostgreSQL v2 metadata fields incorrect (lines 73-77)**: The blog used `schema` and `tableName` which are v1 field names. PostgreSQL v2 does not have a `schema` field and uses `tablePrefix` instead of `tableName`. Removed `schema` field and changed `tableName` to `tablePrefix`.

2. **PostgreSQL v2 Query API claim incorrect (line 83)**: The blog stated PostgreSQL supports "Query API (via JSONB)". PostgreSQL v2 explicitly does NOT support the Query API and uses BYTEA storage, not JSONB. Query API was only available in v1. Fixed the supports/does-not-support lines.

3. **PostgreSQL v2 table columns incorrect (line 83)**: The blog listed an `isbinary` column which exists in v1 but not v2. Since v2 stores everything as BYTEA, the `isbinary` column is not needed. Removed it from the column list.

4. **DynamoDB transactions claim incorrect (lines 149-151)**: The blog stated "Does NOT support: Server-side transactions in Dapr (client-side only)." Per the official Dapr docs, DynamoDB DOES support transactions with a limit of 100 operations per transaction. The Dapr feature comparison table also confirms transaction support. Fixed to correctly state transaction support.

5. **MongoDB metadata field casing wrong (lines 183-186)**: The blog used `writeconcern` and `readconcern` (all lowercase). The official Dapr docs specify `writeConcern` and `readConcern` (camelCase). Incorrect casing would cause the settings to be ignored. Fixed to camelCase.

6. **Redis Query API claim incorrect (line 55)**: The blog stated "Does NOT support: Query API." Per the official Dapr Redis docs, Redis DOES support the Query API when RedisSearch and RedisJSON modules are enabled. Updated to reflect conditional support.

7. **Feature comparison table had multiple errors (lines 191-198)**: DynamoDB Transactions was listed as "No" (should be "Yes (100 op limit)"), PostgreSQL Query API was listed as "Yes" (should be "No" for v2), and Redis Query API was listed as "No" (should be "Yes (with modules)"). Fixed all three cells.

8. **Missing `import json` in Python example (line 206)**: The code used `json.dumps()` but did not import the `json` module. Added the missing import.

## Review Notes
- The Cosmos DB section uses `partitionKey` as a component metadata field with value `/partitionKey`. Per the docs, partition key configuration for non-actor operations is typically passed as request metadata rather than component metadata. However, the component YAML shown is a common and workable pattern, so this was not changed.
- The Cosmos DB Query API status is listed as "No" in the feature table. The Dapr docs are somewhat ambiguous on this — Cosmos DB supports querying within documents but may not fully implement the Dapr State Query API. The current "No" is the safer claim and was left unchanged.
- The Redis and PostgreSQL v2 component YAML examples use `version: v1` and `version: v2` respectively, which are correct per the current Dapr documentation.
- The `redisMaxRetries` field in the Redis config is valid — it is documented as an alias for `maxRetries`.
- The `ttlInSeconds` field in the Redis config is valid as a component-level default TTL setting.
