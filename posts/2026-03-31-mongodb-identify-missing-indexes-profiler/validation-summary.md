# Validation Summary: How to Identify Missing Indexes Using MongoDB Profiler Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Profiler, Indexes, Query Optimization)
- MongoDB Shell (mongosh)
- MongoDB Atlas Performance Advisor

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: system.profile output — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual: db.setProfilingLevel() — https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: $expr operator — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB Manual: Index Build Process (4.2+ changes) — https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found
1. **Deprecated `background: true` option in `createIndex()`**: The post used `background: true` when creating an index, with a comment "(non-blocking on older versions)". The `background` option has been deprecated since MongoDB 4.2 (released 2019) and is ignored in all modern versions. For a 2026 blog post, this is outdated advice. Fixed by removing the `background: true` option and updating the comment to note that MongoDB 4.2+ automatically optimizes index builds.

## Review Notes
- All profiler queries (`planSummary`, `docsExamined`, `nreturned`, `keysExamined`, `command.filter`, `op` values) use correct field names matching the `system.profile` schema.
- The `$expr` with `$max` for division-by-zero protection in the near-miss index query is a correct and idiomatic use of aggregation expressions inside `find()`.
- The compound index design choice of `{ userId: 1, status: 1 }` (higher-cardinality field first) is sound for the equality-equality query pattern shown.
- The `op: { $in: ["query", "update", "remove"] }` filter correctly captures find, update, and delete operations but intentionally excludes aggregation pipelines (`op: "command"`), which is reasonable for this tutorial's scope.
