# Validation Summary: How to Use MongoDB Indexes Effectively

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- MongoDB indexes
- MongoDB query planning and explain output
- MongoDB profiling and index statistics
- MongoDB Node.js driver
- JavaScript

## Sources Consulted
- MongoDB Manual: Indexes - https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Index Types - https://www.mongodb.com/docs/manual/core/indexes/index-types/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: Indexing Strategies / ESR guideline - https://www.mongodb.com/docs/manual/applications/indexes/
- MongoDB Manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Hashed Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
- MongoDB Manual: Create a Hashed Index - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/create/
- MongoDB Manual: Explain Results - https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: cursor.explain() - https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: compact command - https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: db.collection.reIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.reindex/
- MongoDB Manual: Index Builds on Populated Collections - https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Node.js Driver: Indexes for Query Optimization - https://www.mongodb.com/docs/drivers/node/current/indexes/

## Issues Found
- The case-insensitive collation index example did not show that matching queries must use the same collation to use the collation-aware index. Added a query using `.collation({ locale: 'en', strength: 2 })`.
- Two document examples were plain object fragments inside JavaScript code blocks. Converted them to `insertOne()` examples so the snippets are syntactically valid JavaScript/mongosh.
- The sparse unique index comment said sparse indexes "ignore nulls." MongoDB sparse indexes include documents where the indexed field exists with a null value, so the comment now says sparse unique indexes allow multiple documents missing the field but not duplicate null values.
- The TTL insert example used `data: { ... }`, which is not valid JavaScript object syntax. Replaced it with a concrete placeholder object.
- The `explain()` sample placed `winningPlan` at the top level. MongoDB returns it under `queryPlanner.winningPlan`, with `queryPlan` nested under `winningPlan` for slot-based execution in newer versions. Updated the sample and the Node.js helper to handle these shapes.
- The Node.js `isIndexRedundant()` helper compared only field names and ignored index direction/type. Updated it to compare both field names and key values.
- The Node.js query-analysis helper only checked `winningPlan.inputStage?.indexName`, which misses nested plans such as sort/fetch/index-scan plans and newer explain shapes. Added recursive plan-stage lookup for `IXSCAN` and `COLLSCAN`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The index size estimator remains intentionally rough and should not be treated as a capacity-planning substitute for real collection/index statistics.
