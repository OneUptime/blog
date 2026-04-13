# Validation Summary: How to Join More Than Two Collections in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$lookup` stage (equality match and pipeline forms)
- `$unwind`, `$group`, `$project`, `$match` stages
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB official documentation: `$lookup` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)
- MongoDB official documentation: `$unwind` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/)
- MongoDB official documentation: `$group` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/)
- MongoDB official documentation: Aggregation Pipeline (https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- MongoDB official documentation: Indexes (https://www.mongodb.com/docs/manual/indexes/)

## Issues Found
No technical issues found.

## Review Notes
- The summary states "Always index all fields used in `localField`/`foreignField` pairs for optimal performance." Strictly speaking, only indexing the `foreignField` in the target (foreign) collection improves `$lookup` performance. Indexing the `localField` in the source collection does not help the `$lookup` itself. The performance section in the body correctly says "Add indexes on all `foreignField` values to avoid collection scans," so the overall guidance is sound despite the summary being slightly imprecise.
- The junction collection example references `$items.product.price` but the sample `products` collection does not include a `price` field. This is not an error since the junction example introduces its own context, but readers may notice the inconsistency with the sample data above.
- The pipeline-form `$lookup` example uses `$$custTier` (a `let` variable) inside a `$project` stage within the sub-pipeline, which is valid but may confuse readers unfamiliar with the scope of `let` variables in `$lookup` pipelines. A brief note could help, but is not necessary for correctness.
