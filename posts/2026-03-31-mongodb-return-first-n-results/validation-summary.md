# Validation Summary: How to Return Only the First N Results in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell, find/sort/limit/skip cursor methods)
- MongoDB Aggregation Framework ($match, $sort, $limit stages)
- MongoDB Indexing (createIndex)

## Sources Consulted
- MongoDB official documentation: cursor.limit() — https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- MongoDB official documentation: cursor.sort() — https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- MongoDB official documentation: cursor.skip() — https://www.mongodb.com/docs/manual/reference/method/cursor.skip/
- MongoDB official documentation: db.collection.findOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB official documentation: $limit aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/

## Issues Found
- **Contradictory statement about `limit()` parameter**: The Syntax section stated "`n` must be a positive integer" but then immediately described valid behavior for `n = 0` (no limit) and negative values (absolute value with single-batch cursor close). Changed to "`n` is an integer (positive, zero, or negative)" to be consistent with the documented behavior and the bullet points that follow.

## Review Notes
- The performance example creates an index on `{ createdAt: -1 }` alone, but the accompanying query also filters on `{ status: "pending" }`. A compound index `{ status: 1, createdAt: -1 }` would be more efficient for that specific query. The post's advice is not wrong — the index does help with the sort — but readers with large collections and selective filters would benefit from a compound index. This is an optimization suggestion, not a correctness issue.
- All code examples use correct mongosh syntax and would execute as expected.
- The explanation that `sort()` is always applied before `limit()` regardless of chaining order is correct.
- The note about `findOne()` returning a document rather than a cursor is accurate.
- The aggregation pipeline example correctly orders `$match` → `$sort` → `$limit`.
- The caveat about `skip()` performance on large collections is accurate and the recommendation for keyset pagination is appropriate.
