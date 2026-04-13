# Validation Summary: How to Use $facet in MongoDB Aggregation for Multi-Faceted Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$facet` aggregation stage
- `$bucket` aggregation stage
- `$count`, `$group`, `$sort`, `$skip`, `$limit`, `$project`, `$match` stages

## Sources Consulted
- MongoDB $facet documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB $bucket documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB Aggregation Pipeline Limits: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- MongoDB BSON Document Size Limit: https://www.mongodb.com/docs/manual/reference/limits/

## Issues Found
- **Example 3 - Incorrect $bucket output**: The `$bucket` stage uses inclusive lower bounds and exclusive upper bounds. With boundaries `[0, 200, 500, 1000, 2000]`, Desk (price 450) falls in the range 200 <= 450 < 500, so it belongs in bucket `_id: 200`, not `_id: 500`. Similarly, Phone (price 800) falls in 500 <= 800 < 1000, so it belongs in bucket `_id: 500`, not `_id: 1000`. The output was corrected to show the proper bucket assignments: bucket 200 now has count 2 with ["Chair", "Desk"], bucket 500 has count 2 with ["Monitor", "Phone"], and bucket 1000 has count 1 with ["Laptop"].

## Review Notes
- The list of restricted stages within `$facet` sub-pipelines mentions `$facet`, `$out`, and `$merge` but omits other restricted stages like `$collStats`, `$indexStats`, `$geoNear`, `$planCacheStats`, `$search`, `$searchMeta`, and `$vectorSearch`. This is not incorrect (it doesn't claim to be exhaustive), but readers working with those stages should consult the official docs.
- The claim that `$facet` "holds the entire input in memory" is a reasonable simplification. More precisely, each sub-pipeline is subject to the 100 MB memory limit for aggregation stages, and `allowDiskUse` does not apply to stages within `$facet`.
- Example 1's `byCategory` output shows Electronics before Furniture, but both have count 3, so the actual order is non-deterministic. This is acceptable for illustrative purposes.
