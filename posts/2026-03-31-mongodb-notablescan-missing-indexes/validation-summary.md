# Validation Summary: How to Use notablescan to Find Queries Missing Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server parameter `notablescan`)
- MongoDB Shell (`mongosh`) commands
- MongoDB Query Profiler
- MongoDB `explain()` query planner
- Node.js / Jest (test harness example)

## Sources Consulted
- MongoDB official documentation for `notablescan` server parameter: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.notablescan
- MongoDB official documentation for `setParameter` command: https://www.mongodb.com/docs/manual/reference/command/setParameter/
- MongoDB official documentation for `getParameter` command: https://www.mongodb.com/docs/manual/reference/command/getParameter/
- MongoDB official documentation for `explain()`: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation for Database Profiler output: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB error code 291 (`NoQueryExecutionPlans`) behavior confirmed via MongoDB issue trackers

## Issues Found
1. **Incorrect error message**: The post stated the error when `notablescan` blocks a query is `"MongoServerError: No query solutions"`. In modern MongoDB (5.0+), the actual error message is `"MongoServerError: No indexed plans available, and running with 'notablescan'"` (error code 291, `NoQueryExecutionPlans`). Fixed the error text to match current behavior.

2. **Misleading warning about internal operations**: The post warned that "Internal MongoDB operations (like `db.adminCommand` and initial sync) can perform collection scans." Citing `db.adminCommand` here is misleading — it is a shell method for running admin commands, not an internal operation that triggers collection scans. The actual concern is that MongoDB's internal server-side administrative queries against internal collections can be affected. Additionally, oplog and initial sync operations are largely exempt since they operate on capped collections. Fixed the wording to reference "administrative queries against internal collections" instead of `db.adminCommand`.

## Review Notes
- The `setParameter` syntax uses `true`/`false` (boolean) while the official docs example uses `1`/`0` (integer). Both work in practice due to MongoDB's type coercion, so this is not an error.
- The `explain()` output path `winningPlan.stage` is correct for the classic query engine (explainVersion 1). Starting with MongoDB 5.1+ and the slot-based execution engine (SBE, explainVersion 2), the path becomes `winningPlan.queryPlan.stage`. The blog's example is still valid for the classic engine and is the more commonly referenced format.
- The profiler field `planSummary` and the `setProfilingLevel` syntax are both correct.
