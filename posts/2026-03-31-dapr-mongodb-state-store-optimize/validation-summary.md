# Validation Summary: How to Optimize MongoDB as Dapr State Store

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management, component configuration)
- MongoDB (indexing, write concerns, replica sets, TTL)
- Go (Dapr Go SDK for bulk state operations)
- Kubernetes (secrets, kubectl)

## Sources Consulted
- Dapr MongoDB State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr MongoDB component source (document structure): https://github.com/dapr/components-contrib/blob/master/state/mongodb/mongodb.go
- MongoDB `getLastError` command reference: https://www.mongodb.com/docs/manual/reference/command/getLastError/
- MongoDB `createIndex` reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **TTL index field name was incorrect**: The post used `expireDate` as the TTL field name in the index. The Dapr MongoDB state store uses `_ttl` as the BSON field for TTL expiration timestamps. Changed `"expireDate"` to `"_ttl"` in the TTL index creation.

2. **ETag field name was incorrect**: The post used `etag` in the compound index. The Dapr MongoDB state store uses `_etag` (with underscore prefix) as the BSON field name for entity tags. Changed `"etag"` to `"_etag"` in the compound index.

3. **Deprecated `background` index option**: The `background: true` option for `createIndex` has been deprecated and is silently ignored since MongoDB 4.2, which introduced an optimized index build process. Removed `background: true` from both index creation calls.

4. **Removed `getLastError` command**: The post used `db.runCommand({ getLastError: 1, w: "majority", j: true })` to check write concern. The `getLastError` command was removed in MongoDB 5.1. Replaced with `db.adminCommand({ getDefaultRWConcern: 1 })` which is the current way to check default read/write concern settings.

5. **Missing Go imports**: The Go code used `json.Marshal` and `fmt.Sprintf` but only imported `context` and the Dapr client package. Added `encoding/json` and `fmt` to the import block.

## Review Notes
- The Dapr component YAML configuration is correct. All metadata fields (`host`, `username`, `password`, `databaseName`, `collectionName`, `writeConcern`, `readConcern`, `operationTimeout`, `params`) are valid and documented.
- The replica set YAML snippet is presented as a conceptual configuration rather than a standard MongoDB or Kubernetes format. It illustrates the topology but is not directly usable as-is. This is acceptable for illustrative purposes.
- The Go code ignores errors from `dapr.NewClient()` and `json.Marshal()` for brevity, which is common in blog snippets but worth noting.
- The MongoDB connection pool URI parameters (`maxPoolSize`, `minPoolSize`, `maxIdleTimeMS`, `connectTimeoutMS`, `socketTimeoutMS`) are all valid MongoDB connection string options.
