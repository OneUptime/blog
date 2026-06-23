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
- MongoDB Manual: `db.collection.findOneAndUpdate()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.findoneandupdate/
- MongoDB Manual: Query for Null or Missing Fields - https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate. Partial indexes can reduce index size and maintenance cost, can be combined with unique constraints, can function as a more flexible alternative to sparse indexes, and can be used with TTL indexes. The query examples correctly reflect the requirement that MongoDB only uses a partial index when the query predicate includes the filter expression or a predicate that implies it. For time series collections specifically, MongoDB documents an additional partial TTL restriction: the partial filter expression can only reference the collection `metaField`.
