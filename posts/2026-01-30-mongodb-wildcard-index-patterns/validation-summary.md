# Validation Summary: How to Create MongoDB Wildcard Index Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB wildcard indexes
- MongoDB compound wildcard indexes
- MongoDB query planning and `explain()`
- MongoDB shell JavaScript examples

## Sources Consulted
- MongoDB Manual: Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- MongoDB Manual: Wildcard Index Restrictions - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/restrictions/
- MongoDB Manual: Include or Exclude Fields in a Wildcard Index - https://www.mongodb.com/docs/v8.2/core/indexes/index-types/index-wildcard/create-wildcard-index-multiple-fields/
- MongoDB Manual: Compound Wildcard Indexes - https://www.mongodb.com/docs/v8.2/core/indexes/index-types/index-wildcard/index-wildcard-compound/

## Issues Found
- Corrected the description of `{ "$**": 1 }` indexes to state that MongoDB omits `_id` from wildcard indexes by default.
- Updated the example index-entry list to clarify that `_id` is not included by the wildcard index.
- Fixed the event tracking example, which described a compound index but created two separate indexes. The post now says they are separate indexes and notes that MongoDB 7.0+ supports compound wildcard indexes for that pattern.
- Made the `explain()` guidance less brittle by looking for an `IXSCAN` with the wildcard index name instead of assuming a specific `winningPlan.inputStage.indexName` shape.
- Corrected the limitations table: wildcard indexes do not support `$exists: false`; sorting and covered queries are conditionally supported; and a wildcard term can only support one query predicate across multiple wildcard fields.
- Changed the `$indexStats` example comment from memory usage to index usage statistics, because `$indexStats` reports index access statistics rather than memory consumption.
- Updated the summary table to avoid the inaccurate statement that wildcard indexes cannot sort or cover queries at all.

## Review Notes
The MongoDB shell examples use current `createIndex()`, `find()`, `insertOne()`, `insertMany()`, `aggregate()`, `stats()`, and `getIndexes()` APIs. The compound wildcard index section is accurate for MongoDB 7.0 and later.
