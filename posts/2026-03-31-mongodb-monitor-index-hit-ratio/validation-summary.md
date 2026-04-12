# Validation Summary: How to Monitor MongoDB Index Hit Ratio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server, profiler, explain plans, `$indexStats` aggregation stage)
- MongoDB Shell (`mongosh`) commands
- Python with PyMongo driver

## Sources Consulted
- MongoDB official documentation: `explain()` output and `executionStats` structure (https://www.mongodb.com/docs/manual/reference/explain-results/)
- MongoDB official documentation: Database Profiler output fields (https://www.mongodb.com/docs/manual/reference/database-profiler/)
- MongoDB official documentation: `serverStatus` command and `metrics.queryExecutor` (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: `$indexStats` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/)
- MongoDB official documentation: `notablescan` parameter (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.notablescan)
- MongoDB official documentation: `setProfilingLevel` (https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/)

## Issues Found
1. **Incorrect `explain()` output structure**: The JSON example showed `inputStage` directly under `executionStats`, but the correct structure nests it under `executionStats.executionStages`. A typical indexed query shows `executionStages.stage: "FETCH"` with `executionStages.inputStage.stage: "IXSCAN"`. Fixed by adding the `executionStages` wrapper with a `FETCH` stage containing the `IXSCAN` input stage.

2. **Misleading `indexCounters` deprecation note**: The comment said "deprecated in newer versions", but `indexCounters` was fully removed in MongoDB 3.0 (released February 2015). Updated the comment to say "removed in MongoDB 3.0" for accuracy.

## Review Notes
- `datetime.utcnow()` in the Python example is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works but may generate a deprecation warning in newer Python versions. Not changed since it remains functional and the post focuses on MongoDB, not Python best practices.
- The profiler aggregation includes `"remove"` as an operation type. In modern MongoDB (3.0+), delete operations via `deleteOne`/`deleteMany` appear as `command` operations in the profiler, not `remove`. The `remove` op type only appears for legacy `db.collection.remove()` calls. This is a minor nuance and the pipeline would still catch legacy remove operations correctly.
- The `metrics.queryExecutor` section from `serverStatus` provides `scanned` and `scannedObjects` counters but these are aggregate totals since server start, making them less useful for per-query analysis. The post correctly directs readers to the profiler for per-query analysis.
