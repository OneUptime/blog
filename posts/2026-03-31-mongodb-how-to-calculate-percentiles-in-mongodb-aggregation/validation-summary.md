# Validation Summary: How to Calculate Percentiles in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0+ aggregation framework
- `$percentile` accumulator
- `$median` accumulator
- `$group`, `$project`, `$bucket` aggregation stages
- `$arrayElemAt` operator
- Node.js MongoDB driver

## Sources Consulted
- MongoDB $percentile documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/
- MongoDB $median documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/
- MongoDB $bucket documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB $arrayElemAt documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/

## Issues Found
1. **Invalid `method: "continuous"` for `$percentile`** (line 99): The "Approximate vs Exact Method" section claimed that `method: "continuous"` is a valid option for exact percentile calculation. According to the official MongoDB documentation, the `method` parameter is required and **must** be `"approximate"` — there is no `"continuous"` or other alternative method available. The section was rewritten to remove the incorrect `"continuous"` example and clarify that `"approximate"` is the only valid method value.

## Review Notes
- The `$percentile` operator always returns an array, even for a single percentile value. The post correctly demonstrates using `$arrayElemAt` to extract scalar values, which is good practice.
- The alternative approaches for pre-7.0 MongoDB (sort/skip/limit and $bucket) are reasonable workarounds, though the sort/skip/limit approach will not scale well for large collections as noted in the post.
- The t-digest algorithm claim is confirmed by official MongoDB documentation.
- All `$group` stage syntax for both `$percentile` and `$median` is correct.
