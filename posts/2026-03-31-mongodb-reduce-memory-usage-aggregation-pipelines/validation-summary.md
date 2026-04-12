# Validation Summary: How to Reduce Memory Usage in MongoDB Aggregation Pipelines

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MongoDB aggregation framework
- MongoDB `$match`, `$project`, `$group`, `$limit`, `$lookup`, `$sort`, `$unwind` pipeline stages
- `allowDiskUse` option
- `explain("executionStats")` for pipeline profiling

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: `allowDiskUse` — https://www.mongodb.com/docs/manual/reference/command/aggregate/#std-label-aggregate-cmd-allowDiskUse
- MongoDB Manual: `explain()` for aggregation — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB Manual: `$group` accumulator operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/

## Issues Found
1. **Broken "bad" example in $match section**: The `$project` stage in the "bad" example only projected `{ customer: 1, total: 1, items: 1 }`, which drops the `status` field. The subsequent `$match` on `status: "completed"` would then match zero documents because `status` no longer exists. This made the example functionally incorrect, not just slower. Fixed by adding `status: 1` to the `$project` so both "bad" and "good" examples return the same results, correctly illustrating the performance difference.

## Review Notes
- Starting in MongoDB 6.0, the server parameter `allowDiskUseByDefault` defaults to `true`, meaning aggregation stages can spill to disk without explicitly passing `{ allowDiskUse: true }`. The post's advice and syntax remain valid for all versions, but readers on MongoDB 6.0+ should be aware that disk spilling may already be enabled by default.
- The `$group` examples (lines 70-74) are shown as standalone stage snippets rather than full `aggregate()` calls. This is acceptable for illustrative purposes but differs from the style used in other sections.
- The `usedDisk` field reference in the explain output section is correct for MongoDB's aggregation explain results.
