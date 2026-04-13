# Validation Summary: How to Avoid Sort Exceeding Memory Limit Errors in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (aggregation framework, query planner, indexing)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB documentation on sort memory limits and `allowDiskUse`: https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/
- MongoDB documentation on `internalQueryMaxBlockingSortMemoryUsageBytes`: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryMaxBlockingSortMemoryUsageBytes
- MongoDB documentation on aggregation pipeline optimization (top-K / sort + limit coalescence): https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB 4.4 release notes (introduction of `cursor.allowDiskUse()` and rename of sort memory parameter): https://www.mongodb.com/docs/manual/release-notes/4.4/

## Issues Found
1. **Incorrect version for `allowDiskUse()` on `find` cursors**: The post stated this feature requires "MongoDB 6.0+" but `cursor.allowDiskUse()` was introduced in MongoDB 4.4. Changed to "MongoDB 4.4+".
2. **Incorrect version for `internalQueryMaxBlockingSortMemoryUsageBytes`**: The post stated this parameter is available on "MongoDB 6.0+" but it was introduced in MongoDB 4.4 (renamed from `internalQueryExecMaxBlockingSortBytes` which existed in earlier versions). Changed to "MongoDB 4.4+".

## Review Notes
- The error message `Sort exceeded memory limit of 104857600 bytes, but did not opt in to external sorting.` is accurate.
- The 100 MB default sort memory limit (104857600 bytes) is correct.
- The compound index `{ type: 1, timestamp: -1 }` correctly follows the equality-sort-range (ESR) rule for the given query pattern.
- The top-K optimization description ($sort followed immediately by $limit) is accurate.
- The `explain` syntax for both aggregation and find queries is correct.
- All code examples are syntactically valid mongosh JavaScript.
