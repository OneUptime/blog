# Validation Summary: How to Use $merge to Sync Data Between Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$merge` aggregation stage (introduced in MongoDB 4.2)
- `$lookup` for cross-collection joins
- `$set`, `$unset`, `$project` aggregation stages
- `$$NOW` system variable
- MongoDB Node.js driver (async/await pattern)
- mongosh (`db.getSiblingDB()`)

## Sources Consulted
- MongoDB $merge documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB $lookup documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB aggregation system variables ($$NOW): https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB $project documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB Node.js driver aggregation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/aggregation/

## Issues Found
No technical issues found.

## Review Notes
- All `$merge` options used (`whenMatched: "merge"`, `"replace"`; `whenNotMatched: "insert"`) are valid values per the MongoDB documentation.
- `$$NOW` is correctly used as a system variable reference in both `$set` and `$project` stages — it resolves to the current datetime, not a literal string, because `$$`-prefixed identifiers are variable references in aggregation expressions.
- The cross-database `$merge` syntax `{ db: "...", coll: "..." }` is correct and available since MongoDB 4.2.
- In Use Case 2, `.toArray()` is used to consume the aggregation cursor and trigger pipeline execution. This is the correct pattern in the Node.js driver when the pipeline ends with `$merge` (which writes to the target collection rather than returning documents).
- The "Handling Deletions" section correctly notes that `$merge` cannot remove documents. The `distinct()` + `$nin` approach shown is functionally correct, though for very large collections it may not scale well since all source `_id` values are loaded into memory. This is acceptable for a tutorial context.
