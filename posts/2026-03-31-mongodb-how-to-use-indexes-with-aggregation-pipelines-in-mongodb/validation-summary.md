# Validation Summary: How to Use Indexes with Aggregation Pipelines in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- MongoDB indexes (compound, multikey, 2dsphere/geospatial)
- MongoDB query optimizer and explain plans
- MongoDB `$match`, `$sort`, `$geoNear`, `$lookup`, `$unwind`, `$group`, `$project` stages

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: explain() Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: $geoNear Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- MongoDB Manual: $lookup Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: Compound Indexes and the ESR Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/

## Issues Found
No technical issues found.

## Review Notes
- The "BAD" example in "The Golden Rule" section (where `$project` precedes `$match`) is a valid simplification for teaching purposes. In practice, MongoDB's pipeline optimizer may automatically reorder `$match` before `$project` when the match fields are not computed by the project. The advice to explicitly place `$match` first is still correct best practice.
- Example 4 uses `$lookup` with both `localField`/`foreignField` and `pipeline` combined, which requires MongoDB 5.1+. This is appropriate for a post written in 2026.
- The ESR (Equality, Sort, Range) rule is mentioned in the summary but not explained in the body. This is acceptable since it is referenced as supplementary guidance, not the main topic.
