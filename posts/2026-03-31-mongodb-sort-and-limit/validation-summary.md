# Validation Summary: How to Use $sort and $limit in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$sort` aggregation stage
- `$limit` aggregation stage
- `$group` aggregation stage (in combination example)
- `$match` aggregation stage (in combination example)
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB official documentation: `$sort` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB official documentation: `$limit` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/
- MongoDB official documentation: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB official documentation: `$avg` accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- MongoDB official documentation: `allowDiskUse` — https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/

## Issues Found
- **Example 4 — Incorrect `avgScore` value**: The output showed `avgScore: 91.67`, but MongoDB's `$avg` operator returns the full floating-point result, not a rounded value. The correct value for `(92 + 95 + 88) / 3` is `91.66666666666667`. Changed the output to reflect the actual MongoDB behavior.

## Review Notes
- The 100 MB memory limit for `$sort` and the `allowDiskUse` option are accurate. Note that starting in MongoDB 6.0, the server parameter `allowDiskUseByDefault` defaults to `true`, meaning pipeline stages automatically spill to disk when exceeding the memory limit. The post's advice remains valid and is good practice for compatibility with older versions.
- All other code examples, sort orders, and outputs were verified to be correct.
- The $sort + $limit optimization described in the Performance Tips section is accurate — MongoDB's query planner coalesces these into a single top-k sort operation.
