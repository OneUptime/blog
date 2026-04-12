# Validation Summary: New Features in MongoDB 8.0: Improved Queryable Encryption

## Status
validated

## Post Type
Feature overview / Tutorial

## Technologies Covered
- MongoDB 8.0
- Queryable Encryption (range queries)
- MongoDB Plan Cache and Query Shape
- MongoDB bulkWrite command
- Node.js MongoDB driver

## Sources Consulted
- MongoDB 8.0 Release Notes: https://www.mongodb.com/docs/manual/release-notes/8.0/
- Queryable Encryption Fundamentals (Encrypt and Query): https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- Queryable Encryption Overview: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- PlanCache.clearPlansByQuery(): https://www.mongodb.com/docs/manual/reference/method/PlanCache.clearPlansByQuery/
- PlanCache.list(): https://www.mongodb.com/docs/current/reference/method/PlanCache.list/
- planCacheSetFilter (deprecated): https://www.mongodb.com/docs/manual/reference/command/planCacheSetFilter/
- setQuerySettings: https://www.mongodb.com/docs/manual/reference/command/setQuerySettings/
- bulkWrite command (new in 8.0): https://www.mongodb.com/docs/manual/reference/command/bulkWrite/
- Bulk Write Operations: https://www.mongodb.com/docs/manual/core/bulk-write-operations/

## Issues Found

1. **Incorrect version for QE range queries preview**: The post stated "In MongoDB 6.0, Queryable Encryption range queries were in preview." MongoDB 6.0 only supported equality queries for Queryable Encryption. Range queries were introduced as a preview in MongoDB 7.0. Changed "6.0" to "7.0".

2. **Incorrect `clearPlansByQuery` syntax**: The post used a single object argument with named fields (`{ filter: ..., sort: ..., projection: ... }`). The actual method takes three positional arguments: `clearPlansByQuery(query, sort, projection)`. Fixed the syntax to use positional arguments.

3. **Deprecated `planCacheSetFilter` presented as a new 8.0 feature**: The post recommended `planCacheSetFilter` for "pinning a plan to a query shape," but this command is deprecated in MongoDB 8.0. Replaced with `setQuerySettings`, which is the recommended MongoDB 8.0 replacement. Updated the section title, description, and code example accordingly.

4. **Inaccurate bulk write improvement description**: The post claimed MongoDB 8.0 improves `bulkWrite` by "reducing lock contention and improving write batching," which is not substantiated by official documentation. The key 8.0 improvement is a new server-level `bulkWrite` command supporting operations across multiple collections. Updated the description. Also clarified that `{ ordered: false }` parallelization primarily benefits sharded clusters.

## Review Notes
- The `trimFactor` and `sparsity` parameters in the Queryable Encryption example are correctly used with valid values. `trimFactor: 6` is the default value, and `sparsity: 1` is within the valid range of 1-4.
- The `encryptedFieldsMap` schema structure is correct, including the use of `double` and `date` BSON types which are both supported for range queries.
- The `precision: 2` parameter is correctly applied only to the `double` type field (it is not valid for `date`).
- The `getPlanCache().list()` and `getPlanCache().clear()` methods are valid and correctly documented.
- The Node.js driver `bulkWrite` code example uses correct syntax with proper operation models (`insertOne`, `updateOne`, `deleteOne`).
