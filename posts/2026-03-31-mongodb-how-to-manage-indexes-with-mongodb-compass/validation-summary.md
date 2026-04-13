# Validation Summary: How to Manage Indexes with MongoDB Compass

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server-side index management concepts)
- MongoDB Compass (GUI for index creation, monitoring, and removal)
- WiredTiger storage engine (index caching)
- mongosh (shell command equivalents)

## Sources Consulted
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: `createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: `hideIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.hideIndex/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: `dropIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB Manual: Index Properties — https://www.mongodb.com/docs/manual/core/index-properties/
- MongoDB Compass Documentation: Manage Indexes — https://www.mongodb.com/docs/compass/current/indexes/

## Issues Found
- **Partial Filter Expression used `$in` operator**: The example partial filter expression `{ "status": { "$in": ["pending", "processing"] } }` is invalid. MongoDB's `partialFilterExpression` only supports a limited set of operators: `$eq` (or implicit equality), `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, and `$and` at the top level. The `$in` operator is not supported and would cause an error when creating the index. Replaced with `{ "status": { "$eq": "active" }, "priority": { "$gte": 5 } }` which uses only valid operators and still demonstrates the concept of filtering a subset of documents.

## Review Notes
- The `db.orders.stats().indexSizes` command is functional but `db.collection.stats()` has been deprecated since MongoDB 6.2 in favor of the `$collStats` aggregation stage. This is not incorrect for older versions, but worth noting for future updates.
- The "Wildcard" entry in the Index Options section is technically an index type rather than an option. In Compass, wildcard indexes are created by specifying `$**` (or `fieldname.$**`) as the field path, not by toggling a "Wildcard" option. This is slightly misleading but not technically wrong in the context of listing what the Compass index creation dialog supports.
- The "typical index sizes" estimates (50-200 bytes per document for single field, 100-400 for compound) are rough ballpark figures. Actual sizes vary significantly based on field data types, key cardinality, and compression settings, but they are reasonable for illustrative purposes.
- The ESR rule (Equality, Sort, Range) for compound indexes is correctly referenced and is a well-established MongoDB best practice.
- The `hideIndex()` feature requires MongoDB 4.4+. The post does not mention this version requirement, which could be relevant for users on older deployments.
