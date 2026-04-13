# Validation Summary: How to Choose Between Sparse and Partial Indexes in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sparse indexes, partial indexes)
- MongoDB query planner and index selection
- `createIndex` API with `sparse`, `partialFilterExpression`, and `unique` options

## Sources Consulted
- MongoDB Manual — Sparse Indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual — `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **Incorrect claim about sparse indexes and null values (line 13):** The post stated that a sparse index excludes documents where the field "is not null or missing," implying that documents with a null-valued field are excluded. Per MongoDB documentation, sparse indexes *include* documents where the indexed field exists with a null value — they only exclude documents where the field is entirely absent. Fixed the description to: "only includes documents where the indexed field exists, even if the field value is null."

2. **Inverted subset/superset relationship for partial index query compatibility (line 97):** The post stated "MongoDB only uses a partial index when the query filter is a subset of the `partialFilterExpression`." This is backwards. MongoDB uses a partial index when the query's filter *includes* (is a superset of) the `partialFilterExpression` conditions — i.e., the query must cover all the conditions in the partial filter. The code examples immediately following were correct and demonstrated the right behavior; only the prose explanation was inverted. Fixed to: "MongoDB only uses a partial index when the query's filter includes the `partialFilterExpression` conditions."

## Review Notes
- All code examples use correct `createIndex` syntax and valid MongoDB options.
- The comparison table accurately reflects the differences between sparse and partial indexes.
- The conditional unique constraint example (partial index + unique on verified users) is a well-known and correct pattern.
- The claim that "partial indexes are strictly more powerful than sparse indexes" is accurate — a partial index with `{ $exists: true }` in the filter expression is functionally equivalent to a sparse index.
- The post correctly notes that partial indexes require MongoDB 3.2+.
