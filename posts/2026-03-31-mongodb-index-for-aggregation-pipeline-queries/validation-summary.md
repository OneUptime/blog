# Validation Summary: How to Index for Aggregation Pipeline Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- MongoDB indexes (compound indexes, the ESR rule)
- MongoDB `$match`, `$sort`, `$group`, `$lookup` pipeline stages
- MongoDB `explain()` for aggregation pipelines
- `allowDiskUse` option

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: $lookup — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Aggregation Pipeline and Sharded Collections — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-sharded-collections/
- MongoDB Manual: explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/

## Issues Found
1. **Incorrect claim: "only the first pipeline stage can use an index"** — The post stated that only the first pipeline stage can use an index efficiently. This is inaccurate; MongoDB can use indexes for the initial sequence of stages. For example, a `$match` followed by `$sort` can both leverage a compound index. The post itself contradicted this claim in a later section. Fixed by changing "only the first pipeline stage" to "only the initial stages" and noting that a compound index can cover both `$match` and `$sort` when they appear at the beginning.

2. **Incorrect field reference in $lookup section** — The post said "The index must exist on the `from` collection's `localField`." This is wrong. In a `$lookup`, the `localField` is on the input collection and the `foreignField` is on the `from` (foreign) collection. The index needs to be on the `foreignField` of the foreign collection, since that is the field being searched. Fixed "localField" to "foreignField."

## Review Notes
- The "BAD" example in the "$match first" section is semantically different from the "GOOD" example (filtering before vs. after grouping), so it's not a direct apples-to-apples comparison. However, it effectively illustrates the performance principle and is not technically incorrect.
- The `explain()` output example is a simplified representation. Actual output varies by MongoDB version (especially with the SBE engine in 5.0+), but the example is adequate for illustrating what to look for.
- The 100 MB per-stage memory limit is correct for current MongoDB versions.
