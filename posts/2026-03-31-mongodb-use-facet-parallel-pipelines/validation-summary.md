# Validation Summary: How to Use $facet to Run Multiple Aggregation Pipelines in Parallel in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$facet` pipeline stage
- `$bucket`, `$sortByCount`, `$group`, `$unwind`, `$count`, `$addFields`, `$arrayElemAt`
- `$text` search with `$meta: "textScore"`

## Sources Consulted
- MongoDB Manual — $facet (Aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB Manual — Aggregation Pipeline Stages: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB Manual — $bucket: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB Manual — $sortByCount: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/

## Issues Found
1. **Incorrect limitation about `$out` and `$merge`**: The first bullet in the Limitations section stated "`$facet` must be the last stage if its sub-pipelines use `$out` or `$merge`." This is wrong — `$out` and `$merge` are completely disallowed inside `$facet` sub-pipelines, not conditionally allowed based on `$facet`'s position. This bullet also contradicted the second bullet which listed `$out` as disallowed. Removed the incorrect bullet entirely.

2. **Incomplete list of disallowed stages**: The second bullet listed only `$facet`, `$out`, `$geoNear`, and `$indexStats` as disallowed in sub-pipelines. Per MongoDB documentation, the full list also includes `$collStats`, `$merge`, and `$planCacheStats`. Updated the bullet to include all disallowed stages.

## Review Notes
- The title and description use the word "parallel" / "simultaneously" to describe `$facet` sub-pipeline execution. While MongoDB's documentation does not guarantee true parallel execution internally, this phrasing is commonly used and consistent with how MongoDB's own documentation presents `$facet`. This is acceptable as-is.
- All code examples are syntactically correct and use current, non-deprecated MongoDB APIs.
- The `$bucket` examples correctly use `groupBy`, `boundaries`, and `default` fields.
- The `$arrayElemAt` extraction pattern in the final example is correct and idiomatic.
