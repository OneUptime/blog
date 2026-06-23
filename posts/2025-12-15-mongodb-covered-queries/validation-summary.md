# Validation Summary: How to Use MongoDB Covered Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB indexes
- MongoDB covered queries
- MongoDB aggregation pipelines
- JavaScript/mongosh examples

## Sources Consulted
- MongoDB Manual: Query Optimization and Covered Queries - https://www.mongodb.com/docs/manual/core/query-optimization/
- MongoDB Manual: Explain Results - https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Use Indexes to Sort Query Results - https://www.mongodb.com/docs/manual/tutorial/sort-results-with-indexes/
- MongoDB Manual: Multikey Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- MongoDB Manual: Text Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: db.collection.countDocuments() - https://www.mongodb.com/docs/manual/reference/method/db.collection.countdocuments/
- MongoDB Manual: db.collection.distinct() - https://www.mongodb.com/docs/manual/reference/method/db.collection.distinct/
- MongoDB Manual: db.collection.find() projection behavior - https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual: Aggregation Pipeline Optimization - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/

## Issues Found
- Clarified that filter and projection fields must be covered by the same index, matching MongoDB's definition of a covered query.
- Fixed the explain-plan helper so it does not require `nReturned > 0`, because a covered query that returns no matching documents can still be covered. Also updated it to account for `DISTINCT_SCAN`, `inputStages`, and slot-based execution plans under `queryPlan`.
- Corrected the autocomplete index order from `{ prefix: 1, term: 1, popularity: -1 }` to `{ prefix: 1, popularity: -1, term: 1 }` so the index can support sorting by `popularity` after the equality predicate on `prefix`.
- Narrowed the multikey limitation wording. MongoDB documentation says multikey indexes can cover queries over non-array fields in some cases, but cannot cover queries over array fields.

## Review Notes
The examples use mongosh-style `db.collection.find(filter, projection)` and `findOne(filter, projection)` signatures. If the post is later adapted specifically for the MongoDB Node.js driver, those calls should be converted to driver options such as `{ projection: ... }`.
