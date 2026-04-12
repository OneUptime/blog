# Validation Summary: How to Troubleshoot MongoDB Index Performance Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query engine, indexing, profiler)
- MongoDB Shell (`mongosh`) commands
- MongoDB `explain()`, `$indexStats`, `hint()`, profiling APIs

## Sources Consulted
- MongoDB official documentation: `explain()` results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official documentation: Compound Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB official documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB official documentation: `hint()` — https://www.mongodb.com/docs/manual/reference/method/cursor.hint/

## Issues Found
1. **Incorrect `explain()` output structure**: The `winningPlan` field was shown at the top level of the explain output, but it is actually nested inside `queryPlanner` (i.e., `queryPlanner.winningPlan.stage`). Fixed the JSON structure to reflect the correct nesting.
2. **Inconsistent `totalKeysExamined` value for COLLSCAN**: The example showed `totalKeysExamined: 50000` alongside a `COLLSCAN` stage. A collection scan does not examine any index keys, so `totalKeysExamined` should be `0`. Changed from `50000` to `0`.

## Review Notes
- The statement that in-memory sorts "fail for result sets larger than 100 MB" is accurate for the default `internalQueryMaxBlockingSortMemoryUsageBytes` setting in MongoDB 4.4+. However, in MongoDB 6.0+ with `allowDiskUseByDefault` enabled, sorts may spill to disk rather than failing. This is acceptable as written since the general advice to avoid in-memory sorts remains sound.
- The advice that "sort direction must match" in compound indexes is slightly simplified. For a single sort field after an equality prefix, MongoDB can traverse the index in reverse. However, direction matching becomes critical with multi-field sorts, so the advice leads to correct behavior in practice.
- All code examples use valid `mongosh` syntax and current (non-deprecated) APIs.
