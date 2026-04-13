# Validation Summary: How to Avoid Excessive Index Count in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (shell / mongosh)
- MongoDB indexing (compound indexes, index prefixes, `$indexStats`)
- MongoDB index hiding (`hideIndex` / `unhideIndex`, available since 4.4)

## Sources Consulted
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Compound Indexes and Prefixes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/#prefixes
- MongoDB Manual: `$indexStats` Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Manual: Hidden Indexes — https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB Manual: `db.collection.getIndexes()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/

## Issues Found
- **Incorrect compound index consolidation claim**: The "Consolidating Query Patterns into Fewer Indexes" section originally claimed that the compound index `{userId: 1, status: 1, createdAt: -1}` could replace three separate indexes including `{userId: 1, createdAt: -1}`. This is incorrect because the compound index cannot efficiently serve queries like `find({userId: X}).sort({createdAt: -1})` without a `status` equality filter — the `status` field sits between `userId` and `createdAt` in the index key, preventing MongoDB from using the index for the sort. **Fix**: Removed `{userId: 1, createdAt: -1}` from the list of replaced indexes, changed "all three" to "both", and added a note clarifying that a separate `{userId: 1, createdAt: -1}` index is still needed for queries that sort by `createdAt` without filtering by `status`.

## Review Notes
- The post states "Every insert, update, and delete must update all indexes on the affected collection." This is an oversimplification — for update operations, only indexes covering modified fields need updating. Inserts and deletes do update all indexes. This common simplification doesn't lead to incorrect conclusions (the advice to reduce indexes is sound regardless), so it was left as-is.
- The performance numbers in the "Hidden Cost" section (~2ms for 5 indexes, ~8ms for 20 indexes) are illustrative approximations, not benchmarks. The post uses "~" to signal this, which is appropriate.
- The "Target Index Count Guidelines" table provides reasonable rules of thumb. MongoDB's hard limit is 64 indexes per collection, but the post's recommendations are performance-focused guidelines, which is appropriate.
