# Validation Summary: How to Calculate Year-Over-Year Growth in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipeline
- `$group`, `$year`, `$month` operators
- `$lookup` with correlated subquery (self-join pattern)
- `$merge` for materializing intermediate results
- `$setWindowFields` and `$shift` (MongoDB 5.0+)
- `$cond` for conditional expressions

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$group` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$lookup` with pipeline: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$shift` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB `$merge` stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/

## Issues Found
No technical issues found.

## Review Notes
- The `let` clause in the `$lookup` stage declares a `rev` variable that is never referenced in the subpipeline. This is not an error (MongoDB does not reject unused variables), but it is unnecessary. Left as-is since it does not affect correctness.
- The sample data block is labeled as `json` but uses MongoDB shell types (`ObjectId`, `ISODate`) which are not valid JSON. This is a common convention in MongoDB tutorials and not a technical error.
- The post correctly notes that `$shift` requires MongoDB 5.0+. Readers on older versions would need to use the `$lookup` self-join approach instead.
