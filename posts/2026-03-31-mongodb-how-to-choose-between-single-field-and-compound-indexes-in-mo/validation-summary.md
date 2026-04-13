# Validation Summary: How to Choose Between Single Field and Compound Indexes in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (indexing subsystem)
- MongoDB Shell (`mongosh`) commands
- Single-field indexes
- Compound indexes
- Index prefix rule
- Covering queries

## Sources Consulted
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Compound Indexes — https://www.mongodb.com/docs/manual/core/index-compound/
- MongoDB Manual: Index Prefixes — https://www.mongodb.com/docs/manual/core/index-compound/#prefixes
- MongoDB Manual: Index Intersection — https://www.mongodb.com/docs/manual/core/index-intersection/
- MongoDB Manual: createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: db.collection.stats() — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/

## Issues Found
No technical issues found.

## Review Notes
- `db.orders.stats().indexSizes` is technically correct and functional, but `db.collection.stats()` was deprecated in MongoDB 6.2. The recommended replacement is the `$collStats` aggregation stage (e.g., `db.orders.aggregate([{ $collStats: { storageStats: {} } }])`). This is a minor version-specific caveat; the shown syntax still works in current MongoDB versions.
- The index prefix rule explanation and examples are well done and accurately reflect MongoDB behavior.
- The claim about index intersection is appropriately qualified with "with exceptions."
