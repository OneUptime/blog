# Validation Summary: How to Use explain() on Aggregation Pipelines in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, explain plans)
- MongoDB Shell (mongosh)
- MongoDB Indexes (single-field and compound)

## Sources Consulted
- MongoDB official documentation on `db.collection.explain()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB official documentation on explain results: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation on aggregation pipeline optimization: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB official documentation on `allowDiskUse` and memory limits for aggregation stages: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/#-sort-operator-and-memory

## Issues Found
1. **`usedDisk` incorrectly listed as an `executionStats` field.** The post listed `usedDisk` alongside `nReturned`, `totalDocsExamined`, `totalKeysExamined`, and `executionTimeMillis` in a code block immediately after `printjson(stats.executionStats)`, implying it is a top-level `executionStats` field. In reality, `usedDisk` is a stage-level field that appears within individual aggregation stages (like `$sort` and `$group`) in the explain output, not in the `executionStats` section. **Fix:** Removed `usedDisk` from the `executionStats` field list and added a separate paragraph explaining that `usedDisk` is a stage-level field for stages that can spill to disk.

## Review Notes
- The post uses `result.queryPlanner.winningPlan` to access the winning plan from aggregation explain output. This path works correctly in MongoDB 5.0+ with the Slot-Based Execution (SBE) engine for pipelines that can be pushed down to the query layer. In older versions or with the classic engine, the path would be `result.stages[0].$cursor.queryPlanner.winningPlan`. Since the post targets modern MongoDB usage, this is acceptable but worth noting for readers on older versions.
- The post omits the third verbosity level `allPlansExecution`, which is a valid option but not commonly needed for typical performance tuning. This omission is reasonable for a focused tutorial.
- The `SORT_KEY_GENERATOR` stage mentioned in the blocking sort section is valid but appears primarily in the classic query engine. Under SBE, the sort representation may differ. This is a minor version-specific nuance that does not affect the correctness of the advice.
