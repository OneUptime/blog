# Validation Summary: How to Use MongoDB Partial Indexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB partial indexes
- MongoDB indexes and `db.collection.createIndex()`
- MongoDB unique indexes
- MongoDB sparse indexes
- MongoDB TTL indexes
- MongoDB query planning and `explain()`
- JavaScript / mongosh examples

## Sources Consulted
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: `db.collection.createIndex()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Query for Null or Missing Fields - https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/

## Issues Found
- The post used `{ deletedAt: { $exists: false } }` in a partial index filter and query. MongoDB's documented supported `partialFilterExpression` operators include `$exists: true`, but not `$exists: false`. Changed the soft-delete example to use the equality filter `{ deletedAt: null }`, which matches null or missing fields and remains valid for active documents when deleted documents receive a date value.
- The filter-operator list showed `$exists` with `{ deletedAt: { $exists: false } }`. Changed it to `{ email: { $exists: true } }` to match MongoDB's documented partial-index operator support.

## Review Notes
The post is otherwise technically accurate. Partial indexes can reduce index size and maintenance cost, can be combined with unique constraints, can function as a more flexible alternative to sparse indexes, and can be used with TTL indexes. Query examples correctly reflect the requirement that MongoDB only uses a partial index when the query predicate includes the filter expression or a predicate that implies it.
