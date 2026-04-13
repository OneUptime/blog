# Validation Summary: How to Monitor Aggregation Pipeline Performance in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation framework
- MongoDB `explain()` for aggregation pipelines
- MongoDB database profiler (`system.profile`)
- MongoDB `$planCacheStats` aggregation stage
- `mongotop` and `mongostat` CLI tools
- MongoDB Atlas Performance Advisor
- MongoDB compound indexes for aggregation optimization

## Sources Consulted
- MongoDB official docs: `db.collection.explain()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB official docs: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official docs: System Profile collection output — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB official docs: Aggregation Pipeline Limits (100MB memory) — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- MongoDB official docs: `$planCacheStats` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/
- MongoDB official docs: `mongostat` — https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB official docs: `mongotop` — https://www.mongodb.com/docs/database-tools/mongotop/
- MongoDB official docs: `allowDiskUse` — https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/

## Issues Found
No technical issues found.

## Review Notes
- The `execStats.stage` field path used to find COLLSCAN operations in `system.profile` is valid, but `planSummary` is a more commonly used and reliable alternative since `execStats` is a tree structure where COLLSCAN may be nested under `inputStages` rather than at the top level.
- The `--humanReadable` flag on `mongostat` defaults to `true`, so passing it explicitly is redundant but not incorrect.
- The `$planCacheStats` stage must be the first (and only) stage in the pipeline, which is correctly shown in the example but not explicitly stated in the text.
- The 100MB memory limit description as "per stage" is accurate — MongoDB documentation describes specific stages ($sort, $group, $bucket, etc.) as individually subject to this limit, not the pipeline as a whole.
