# Validation Summary: What Is $facet and When to Use It in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Aggregation Framework
- `$facet` aggregation stage
- `$bucket` aggregation stage
- `$group`, `$sort`, `$limit`, `$count`, `$unwind`, `$match` stages

## Sources Consulted
- MongoDB $facet documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB $bucket documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB $count documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
- MongoDB Aggregation Pipeline Limits: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/

## Issues Found
1. **Incomplete list of disallowed stages in $facet sub-pipelines**: The post listed only `$facet`, `$out`, `$merge`, and `$geoNear` as disallowed inside `$facet` sub-pipelines. The official MongoDB documentation also disallows `$collStats`, `$indexStats`, and `$planCacheStats`. Added these three to the restriction list.

## Review Notes
- The official docs also disallow `$search` and `$searchMeta` inside `$facet`, but these are MongoDB Atlas-specific operators and their omission is reasonable for a general MongoDB tutorial.
- The "single pass" / "processed only once" phrasing is a slight simplification — documents are fetched once and distributed to all sub-pipelines — but this is an acceptable description for a tutorial-level post.
- All code examples are syntactically correct and use current, non-deprecated APIs.
- The `$bucket` usage (groupBy, boundaries, default, output) is correct per official docs.
- The 100 MB RAM limit per pipeline stage and `allowDiskUse: true` advice are accurate.
