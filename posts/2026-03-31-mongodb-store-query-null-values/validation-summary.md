# Validation Summary: How to Store and Query Null Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query language, BSON types, indexing)
- MongoDB Shell (`mongosh`) JavaScript syntax
- MongoDB operators: `$type`, `$exists`, `$ne`, `$set`, `$unset`
- MongoDB indexes: sparse indexes, partial indexes

## Sources Consulted
- MongoDB Manual — Query for Null or Missing Fields: https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- MongoDB Manual — $type operator: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB Manual — $exists operator: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB Manual — Sparse Indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual — $unset operator: https://www.mongodb.com/docs/manual/reference/operator/update/unset/

## Issues Found
1. **Sparse index description was incorrect.** The post stated that sparse indexes "only index documents where the field exists and is not null." This is wrong. Per MongoDB documentation, sparse indexes contain entries for documents that have the indexed field **even if the value is null**. They only skip documents where the field is missing entirely. The inline code comment and surrounding prose were both corrected to reflect this. The note about query planner behavior was also rewritten to accurately explain why sparse indexes aren't selected for `{ field: null }` queries (incomplete results due to missing-field documents not being in the index).

## Review Notes
- The query `{ deletedAt: { $ne: null, $exists: true } }` uses a redundant `$exists: true` since `$ne: null` already excludes both null and missing fields. This is not technically wrong (it returns correct results), and it's a common defensive pattern, so it was left as-is.
- The partial index example using `partialFilterExpression: { deletedAt: null }` is valid syntax. However, the query planner's ability to use partial indexes with null-matching filter expressions can vary by MongoDB version. This is an edge case worth noting for readers on older MongoDB versions.
- All other code examples (`insertMany`, `find`, `updateOne`, `$set`, `$unset`, `$type: "null"`, `$exists`) are syntactically correct and produce the described results.
