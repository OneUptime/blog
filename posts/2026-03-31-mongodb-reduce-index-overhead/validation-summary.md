# Validation Summary: How to Reduce Index Overhead in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (indexing, write performance, query planner)
- MongoDB Shell (`mongosh`) commands
- MongoDB aggregation framework (`$indexStats`)

## Sources Consulted
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Manual: Hidden Indexes — https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Index Build Process (4.2+) — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: Build Indexes on Replica Sets (Rolling) — https://www.mongodb.com/docs/manual/tutorial/build-indexes-on-replica-sets/

## Issues Found
1. **Step 4 heading was misleading**: The heading "Use Sparse Indexes for Low-Cardinality Fields" incorrectly described sparse indexes as being for low-cardinality fields. Sparse indexes are for fields that are *absent* from many documents, not fields with few distinct values. The body text was correct, so only the heading was changed to "Use Sparse Indexes for Optional Fields."

2. **Step 7 used deprecated `{ background: true }` option**: The `background` option for `createIndex()` was deprecated in MongoDB 4.2 and is ignored in all versions since. MongoDB 4.2+ uses an optimized index build process automatically that only holds exclusive locks at the start and end of the build. Updated the section to remove the deprecated option and explain the modern behavior, including the rolling index build procedure for replica sets.

## Review Notes
- The `db.collection.stats()` method used in Step 6 is deprecated in MongoDB 6.2+ in favor of the `$collStats` aggregation stage. It still works but may be removed in a future version. Not changed since it remains functional and widely used.
- The `$indexStats` sample output is simplified for readability (actual output includes additional fields like `key`, `host`, and `spec`). This is acceptable for a tutorial.
