# Validation Summary: How to Build Data Transformations with MongoDB Aggregation Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipelines
- MongoDB aggregation stages: `$match`, `$group`, `$project`, `$unwind`, `$lookup`, `$addFields`, `$sort`, `$skip`, `$limit`, `$out`, `$merge`
- MongoDB aggregation expressions and accumulators: `$sum`, `$avg`, `$multiply`, `$reduce`, `$size`, `$dateToString`, `$push`, `$addToSet`, `$cond`, `$switch`, `$round`
- MongoDB indexes and aggregation pipeline optimization
- mongosh `db.collection.aggregate()` and `db.collection.createIndex()`

## Sources Consulted
- MongoDB Manual: `db.collection.aggregate()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- MongoDB Manual: Aggregation stages - https://www.mongodb.com/docs/manual/reference/mql/aggregation-stages/
- MongoDB Manual: `$lookup` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: Aggregation pipeline optimization - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: `$reduce` expression operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/
- MongoDB Manual: `$addToSet` accumulator operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/addtoset/
- MongoDB Manual: `$round` expression operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB Manual: `$cond` expression operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB Manual: `$merge` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB Manual: `$out` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/

## Issues Found
- The "Calculate total revenue per customer" example unwound `items` and then used `{ $sum: 1 }` for `orderCount`, which counted item rows rather than orders. The same pipeline computed `avgOrderValue` from each item line total rather than from each order total. I changed the example to compute `orderTotal` with `$reduce` before grouping, then sum and average that per-order value by customer.
- The debugging section said to use `$out` or `$merge` to save intermediate results without noting that these stages must be final stages in the aggregation pipeline. I updated the sentence to make that restriction explicit.

## Review Notes
The examples are written for mongosh-style JavaScript snippets. The `$lookup` example assumes the `orders.customerId` values and `customers._id` values have matching BSON types; in a real schema, joins will not match if one side is a string and the other side is an `ObjectId`.
