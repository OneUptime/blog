# Validation Summary: How to Use $merge for Incremental Materialized Views in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$merge`, `$group`, `$match`, `$lookup`, `$set`, `$unset`, `$out`)
- MongoDB `$dateToString` operator
- MongoDB `$$new` and `$$NOW` system variables
- MongoDB `$count` accumulator (MongoDB 5.0+)
- MongoDB Node.js driver (Pattern 3)

## Sources Consulted
- MongoDB $merge aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB $out aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB aggregation variables ($$new, $$NOW): https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB $count accumulator operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/
- MongoDB $dateToString operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB on-demand materialized views: https://www.mongodb.com/docs/manual/core/materialized-views/

## Issues Found
- **Pattern 3 `deleteMany` query used wrong field path**: The `deleteMany` call queried on `date` (a top-level field), but the documents stored in `rolling_summary` have the date nested inside `_id.date` (since the `$group` stage produces `_id: { date: ..., product: ... }`). This meant the cleanup query would never match any documents and old data would accumulate indefinitely. Fixed by changing `date` to `"_id.date"` in the query filter.

## Review Notes
- The `$count: {}` accumulator used in Pattern 3 requires MongoDB 5.0+. The post does not specify a minimum MongoDB version, which could confuse users on older versions. This is not an error but could be noted.
- Pattern 3 calls `.toArray()` on the aggregation cursor to trigger execution. This is correct for the Node.js driver — the pipeline with `$merge` writes to the output collection and returns an empty cursor, but iteration is required to execute it.
- The `on: "_id"` field is explicitly specified in all `$merge` stages. While `_id` is the default and could be omitted, being explicit is good practice for clarity.
