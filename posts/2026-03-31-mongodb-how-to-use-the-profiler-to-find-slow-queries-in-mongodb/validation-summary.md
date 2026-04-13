# Validation Summary: How to Use the Profiler to Find Slow Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Database Profiler
- MongoDB Shell (mongosh)
- MongoDB Aggregation Framework
- MongoDB Index Management
- MongoDB Configuration (mongod.conf)

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: db.setProfilingLevel() — https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB Manual: db.getProfilingStatus() — https://www.mongodb.com/docs/manual/reference/method/db.getProfilingStatus/
- MongoDB Manual: system.profile Collection — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual: operationProfiling Configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#operationprofiling-options
- MongoDB Manual: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/

## Issues Found
No technical issues found.

## Review Notes
- The `db.setProfilingLevel(2, { slowms: -1 })` call is technically valid but redundant — level 2 profiles all operations regardless of the `slowms` threshold. This is a common pattern used for explicitness, so it is not incorrect.
- The sample profiler output shows `"op": "query"`, which is accurate for legacy OP_QUERY protocol operations. In MongoDB 3.6+, find operations executed via the `find` command may appear as `"op": "command"` in the profiler. The post does not claim a specific MongoDB version, and both representations are valid, so this is not an error.
- The compound index `{ customerId: 1, status: 1, createdAt: -1 }` correctly follows the Equality-Sort-Range (ESR) guideline for the demonstrated query pattern with equality filters on `customerId` and `status` and a sort on `createdAt`.
- The procedure for resizing the `system.profile` capped collection (disable profiling, drop, recreate, re-enable) is the correct approach.
