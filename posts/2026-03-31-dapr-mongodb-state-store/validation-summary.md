# Validation Summary: How to Configure Dapr with MongoDB State Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- MongoDB (state store component)
- MongoDB Atlas (managed cloud service)
- Docker (local MongoDB setup)
- Kubernetes (secret management)
- Dapr Query API (alpha)

## Sources Consulted
- Dapr MongoDB state store component specification (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/)
- Dapr state management API reference (https://docs.dapr.io/reference/api/state_api/)
- Dapr query API reference and how-to guide (https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/)
- Dapr MongoDB state store source code (`mongoDBMetadata` struct and `getMongoConnectionString()` implementation)

## Issues Found

1. **Invalid `replicaSet` metadata field** (Replica Set section): The post listed `replicaSet` as a standalone component metadata field. This is not a recognized metadata field in the Dapr MongoDB state store component. The replica set name should be passed via the `params` field (e.g., `?replicaSet=rs0`). Fixed by changing the field from `replicaSet` with value `"rs0"` to `params` with value `"?replicaSet=rs0"`.

2. **Incorrect `key` field reference in mongosh queries** (Inspecting State section): The query `db.state.find({}, { key: 1, _id: 0 })` referenced a `key` field that does not exist in the Dapr MongoDB document schema. Dapr stores the state key as the MongoDB `_id` field. Fixed to `db.state.find({}, { _id: 1, value: 0, _etag: 0 })`.

3. **Non-existent `updateTime` field in mongosh query** (Inspecting State section): The query `db.state.find().sort({ updateTime: -1 })` referenced an `updateTime` field that does not exist in the Dapr MongoDB document schema. The stored fields are `_id`, `value`, `_etag`, and optionally `_ttl`. Fixed to a query that shows `_id` and `_etag` fields instead.

## Review Notes
- The `connectionString` metadata field used in the "Using MongoDB Connection String" section is valid (confirmed in source code) but is not documented on the official Dapr docs page. Readers may not find it in official references.
- The Dapr query API endpoint (`v1.0-alpha1`) is still in alpha status as of Dapr v1.14/v1.15. The post correctly uses the alpha endpoint but does not explicitly note the alpha status. A future update could add a note about this.
- The `server` and `host` metadata fields are mutually exclusive. The post uses them in separate sections which is correct, but does not explicitly warn against using both simultaneously.
