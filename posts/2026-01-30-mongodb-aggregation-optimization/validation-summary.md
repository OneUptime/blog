# Validation Summary: How to Build MongoDB Aggregation Pipeline Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB aggregation pipelines
- MongoDB indexes
- MongoDB `$lookup`, `$match`, `$sort`, `$group`, `$project`, `$bucket`, and `$bucketAuto` stages
- MongoDB `explain()` and aggregation memory settings
- JavaScript/mongosh examples

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline Optimization - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: `$project` aggregation stage placement - https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB Manual: `$match` aggregation stage pipeline optimization - https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB Manual: `$sort` aggregation stage and index use - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB Manual: `$group` aggregation stage performance optimizations - https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB Manual: Aggregation Pipeline Limits - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- MongoDB Manual: `db.collection.aggregate()` and `allowDiskUseByDefault` - https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- MongoDB Manual: `$lookup` aggregation stage performance considerations - https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: Explain Results - https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found
- The post recommended using `$project` early as a general performance optimization. MongoDB documentation says early or middle `$project` stages used only to reduce returned fields are unlikely to improve performance because MongoDB performs field-pruning optimizations automatically. Updated the guidance to recommend `$project` when it intentionally changes the shape of data needed by later stages or limits fields returned from joins.
- The index-eligible aggregation stage list was too narrow and partially inaccurate. Updated it to match MongoDB documentation: `$match` can use an index when first after query-planner optimization, `$sort` can use an index when first or only preceded by `$match`, and `$group` has limited index optimizations for `$first`/`$last` with compatible sort/group patterns.
- The memory-limit explanation was outdated for MongoDB 6.0 and later. Updated it to mention the `allowDiskUseByDefault` server parameter and clarify that stages exceeding 100MB may spill to disk by default or error depending on configuration.
- The explain-plan code accessed version-dependent nested fields directly. Replaced the brittle field access with `printjson(explanation)` and guidance to inspect `executionStats`, `totalDocsExamined`, `IXSCAN`/`COLLSCAN`, and `usedDisk`, since MongoDB explain output shape varies by version and execution engine.
- The covered aggregation example implied a guaranteed no-document-fetch outcome. Updated it to say the aggregation can be covered by the fields it reads and to verify with `explain()` that `totalDocsExamined` is `0` for the specific MongoDB version and query shape.

## Review Notes
The examples are syntactically valid for mongosh-style JavaScript. Several performance numbers in the real-world example are illustrative and should be treated as workload-dependent rather than guaranteed outcomes.
