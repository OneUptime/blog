# Validation Summary: How to Compare Query Plans Before and After Index Changes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell, explain plans, index management)
- MongoDB Query Planner and executionStats
- MongoDB createIndex / dropIndex
- JavaScript (mongosh scripting)

## Sources Consulted
- MongoDB official documentation on `explain()`: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation on `createIndex()` options: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on `background` index build option deprecation (deprecated in 4.2): https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB official documentation on `currentOp()`: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation on `collStats`: https://www.mongodb.com/docs/manual/reference/command/collStats/

## Issues Found
1. **`background: true` option is deprecated**: The `background` option for `createIndex()` was deprecated in MongoDB 4.2. Since MongoDB 4.2+, all index builds use an optimized build process that holds an exclusive lock only at the start and end of the build, making the `background` option unnecessary and ignored. Removed `background: true` from the `createIndex()` call.

2. **Incorrect method to check index build status**: The post used `db.orders.stats().indexBuilds` to check whether an index build was complete. The `collStats` command does not have an `indexBuilds` field. Replaced with `db.currentOp({ "command.createIndexes": "orders" })`, which is the correct way to check for in-progress index builds.

3. **Inconsistent `nReturned` in example output**: The example output showed `nReturned: 100` for both before and after, but the query throughout the post uses `.limit(50)`. With a limit of 50, `nReturned` can be at most 50. Changed to `nReturned: 50` for both before and after, and updated `examineRatio` from `100` to `200` (before) to maintain mathematical consistency (10000 docs examined / 50 returned = 200).

## Review Notes
- The `extractMetrics` helper function correctly traverses `inputStage` and `inputStages` to handle both simple and compound query plans (e.g., `OR` stages).
- The `examineRatio` metric (docs examined / docs returned) is a well-established indicator of index efficiency, and the post correctly identifies 1.0 as ideal.
- The post's approach of testing a suite of queries after an index change (Step 6) is a sound practice to catch index regressions.
- The `explain("executionStats")` verbosity level is the correct choice for this use case — it provides actual execution metrics without the overhead of `"allPlansExecution"`.
