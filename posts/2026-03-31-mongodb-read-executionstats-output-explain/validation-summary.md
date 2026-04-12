# Validation Summary: How to Read the executionStats Output in MongoDB explain()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (explain() method, executionStats verbosity)
- MongoDB query execution stages (IXSCAN, COLLSCAN, FETCH, SORT)
- MongoDB indexing and query optimization

## Sources Consulted
- MongoDB official documentation: db.collection.explain() — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB official documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: Query Plans — https://www.mongodb.com/docs/manual/core/query-plans/

## Issues Found
1. **FETCH stage description incorrectly referenced `_id`**: The post stated that FETCH works by "Fetching documents by `_id` after an index scan." This is technically inaccurate. The FETCH stage retrieves full documents from the collection using an internal RecordId pointer stored in index entries, not via the `_id` field. Changed to: "Retrieving full documents from the collection after an index scan."

## Review Notes
- All executionStats field names (`executionSuccess`, `nReturned`, `executionTimeMillis`, `totalKeysExamined`, `totalDocsExamined`, `executionStages`) are correct.
- The execution stage names (IXSCAN, COLLSCAN, FETCH, SORT) are accurate.
- The SORT stage `memLimit` value of 104857600 (100 MB) is the correct default MongoDB sort memory limit.
- The `usedDisk` field in the SORT stage is available in modern MongoDB versions (6.0+ where `allowDiskUseByDefault` is true).
- The description of SORT as "An in-memory sort" is a slight simplification — it is more precisely a non-index (blocking) sort that starts in memory but can spill to disk. The practical guidance given is correct, so this was left as-is.
- The `explain("executionStats")` syntax and overall structure of the explain output are accurate.
