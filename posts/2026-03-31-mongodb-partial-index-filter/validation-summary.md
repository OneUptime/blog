# Validation Summary: How to Create a Partial Index in MongoDB with filterExpression

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (partial indexes, `partialFilterExpression`)
- MongoDB Shell (`mongosh`)
- Node.js MongoDB driver

## Sources Consulted
- MongoDB official documentation: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB official documentation: `db.collection.createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB SERVER-59508 (added `$or` and `$in` support in partialFilterExpression, MongoDB 5.1+)
- MongoDB official documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found

1. **Incomplete operator list for `partialFilterExpression`**: The post only listed the operators available since MongoDB 3.2 (`$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, `$and`). Starting with MongoDB 5.0/5.1, `$or` and `$in` are also supported. Added these with a version annotation.

2. **Outdated `$and` restriction**: The post stated `$and` was supported at "top-level only." This restriction was relaxed in MongoDB 5.1+ (expanded tree depth from 2 to 4). Removed the "top-level only" qualifier since it no longer applies to modern versions.

3. **Fragile `explain()` output path in Node.js example**: The code accessed `plan.queryPlanner.winningPlan.inputStage.indexName`, which only works with the classic query engine. MongoDB 5.1+ uses the Slot-Based Execution (SBE) engine by default for many queries, where the path is `winningPlan.queryPlan.inputStage.indexName`. Updated the code to handle both engine types.

## Review Notes
- The post correctly notes that partial indexes were introduced in MongoDB 3.2.
- The explanation of query planner requirements (query must include the filter condition) is accurate.
- The partial unique index behavior is correctly described.
- The `$in` query example (line showing `$in: ["active", "cancelled"]` not using the index) is correct — even though `$in` is now supported in `partialFilterExpression`, the query planner still won't use the partial index if the query could return documents outside the filter.
- The Node.js code structure is idiomatic and uses the current `mongodb` driver API correctly.
