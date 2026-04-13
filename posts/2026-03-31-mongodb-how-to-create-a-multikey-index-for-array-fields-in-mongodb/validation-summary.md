# Validation Summary: How to Create a Multikey Index for Array Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multikey indexes, `createIndex()`, `explain()`, `$indexStats`)
- MongoDB query operators (`$in`, `$all`, `$gte`, `$lte`, `$elemMatch`)
- MongoDB compound indexes with array fields
- MongoDB shard key restrictions

## Sources Consulted
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Manual: db.collection.getIndexes() — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB Manual: $indexStats Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Manual: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: Shard Key Indexes — https://www.mongodb.com/docs/manual/core/sharding-shard-key/#shard-key-indexes

## Issues Found
1. **Incorrect claim about `getIndexes()` showing multikey status**: The post stated to use `db.articles.getIndexes()` and "look for `multikey: true` in the index metadata." This is incorrect — `getIndexes()` returns index specifications (keys, name, uniqueness, etc.) but does not include a `multikey` field. The multikey status is runtime metadata available through `explain()` output (in the IXSCAN stage's `isMultiKey` field) or through the `$indexStats` aggregation stage. Fixed by removing the `getIndexes()` suggestion and replacing it with the `$indexStats` aggregation approach, while keeping the already-correct `explain()` example.

## Review Notes
- The post correctly notes that MongoDB automatically determines multikey status based on document data, not the `createIndex()` call itself. The index becomes multikey when it encounters array values.
- The compound index restriction (at most one array field) is accurately described.
- The limitations section states multikey indexes "cannot cover queries." This is the general rule per MongoDB documentation, though MongoDB 3.6+ introduced limited support for covered queries with `$elemMatch` on multikey indexes. The blanket statement matches official docs and is acceptable for a tutorial.
- The index bounds example is simplified but directionally correct. For multikey indexes without `$elemMatch`, range predicates like `{ $gte: 9, $lte: 11 }` can match documents where different array elements satisfy different parts of the predicate — the post's note about examining more keys than expected is a useful caveat.
