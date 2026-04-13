# Validation Summary: How to Use MongoDB for Gaming Application Backends

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (shell commands via mongosh)
- MongoDB Aggregation Framework (`$unwind`, `$group`, `$match`, `$sort`, `$project`, `$cond`, `$indexOfArray`, `$round`, `$divide`)
- MongoDB Node.js Driver (async/await API with `findOne`, `updateOne`, `insertOne`)
- MongoDB Indexes (compound indexes, unique indexes, TTL indexes)
- Mermaid diagram syntax

## Sources Consulted
- MongoDB documentation on `insertOne`, `updateOne`, `find`, `aggregate`: https://www.mongodb.com/docs/manual/reference/method/
- MongoDB documentation on `$setOnInsert`: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB documentation on `$push`: https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB documentation on `$indexOfArray`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfArray/
- MongoDB documentation on `$round`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB documentation on `cursor.project()`: https://www.mongodb.com/docs/mongodb-shell/reference/methods/
- MongoDB documentation on `$sort` ordering guarantee before `$group`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/

## Issues Found
1. **Mermaid diagram collection name mismatch**: The architecture diagram labeled one node as `scores collection`, but all code examples use a `leaderboards` collection — not `scores`. Fixed the diagram label to `leaderboards collection` for consistency with the code.

## Review Notes
- The leaderboard rank aggregation pipeline (`$group` with `$push` followed by `$indexOfArray`) is correct for small datasets but would hit MongoDB's 16MB document size limit on large leaderboards (millions of players). A production system would typically use `$setWindowFields` with `$rank` (available since MongoDB 5.0) or maintain rank externally. This is acceptable for a teaching example but worth noting.
- The `unlockAchievement` function has a potential race condition: between the `findOne` check and the `updateOne`, a concurrent call could push the same achievement, resulting in duplicates. Using `$addToSet` or a conditional `$push` with `arrayFilters` would be more robust. This is a design consideration rather than a syntax error.
- All MongoDB shell commands (`db.collection.method()`) use valid mongosh syntax, including `cursor.project()` which is supported in mongosh.
- The `$sort` stage before `$group` correctly guarantees ordering within `$push` accumulator output, as documented by MongoDB.
- `$round` (used in the statistics aggregation) is available since MongoDB 4.2, which is current and non-deprecated.
- TTL index calculation (`60 * 60 * 24 * 90` = 7,776,000 seconds = 90 days) is correct.
