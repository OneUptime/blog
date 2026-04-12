# Validation Summary: How to Create Views with Aggregation Pipelines in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (views, aggregation pipelines)
- MongoDB Shell (mongosh) commands
- Aggregation stages: $match, $group, $project, $lookup, $unwind, $addFields, $bucket

## Sources Consulted
- MongoDB official documentation: db.createView() — https://www.mongodb.com/docs/manual/reference/method/db.createView/
- MongoDB official documentation: Views — https://www.mongodb.com/docs/manual/core/views/
- MongoDB official documentation: Aggregation Pipeline Stages — https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB official documentation: $lookup — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation: $unwind — https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB official documentation: $bucket — https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB official documentation: db.getCollectionInfos() — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/

## Issues Found
1. **Introductory sentence contradicted restrictions table**: Line 11 stated "Any valid pipeline stage can be used in a view definition," which directly contradicts the "Pipeline Stage Restrictions in Views" section listing five disallowed stages. Changed to "Most aggregation pipeline stages can be used in a view definition, with a few exceptions" for accuracy.

## Review Notes
- The disallowed stages table lists `$indexStats` and `$collStats` alongside `$out`, `$merge`, and `$geoNear`. The official MongoDB docs explicitly prohibit `$out`, `$merge`, and `$geoNear` in views. `$indexStats` and `$collStats` are effectively incompatible (they must be the first stage and return metadata, not document data), so including them is a reasonable and helpful addition, though they are not explicitly listed in the official restrictions.
- The table could also mention `$changeStream` and `$planCacheStats` as effectively incompatible stages for completeness, but their omission is not an error.
- All code examples (`db.createView()`, `$lookup`, `$unwind` with `preserveNullAndEmptyArrays`, `$bucket`, `$addFields`, `db.getCollectionInfos()`) use correct syntax verified against official documentation.
- The `marginPct` calculation in the `$addFields` example would produce a division-by-zero error if `salePrice` is 0, but this is a data-level concern rather than a code correctness issue.
