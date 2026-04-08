# Validation Summary: How to Calculate Churn Rate in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$match`, `$count`, `$facet`, `$project`, `$group`, `$sort`)
- MongoDB date operators (`$year`, `$month`)
- MongoDB arithmetic operators (`$divide`, `$multiply`)
- MongoDB array operator (`$arrayElemAt`)
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$facet` stage reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB `$count` stage reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
- MongoDB `$arrayElemAt` reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB `$exists` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB `$group` stage reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB index documentation: https://www.mongodb.com/docs/manual/indexes/

## Issues Found
No technical issues found.

## Review Notes
- The `$facet` stage does not use indexes for `$match` stages within its sub-pipelines. The recommended compound index on `{startDate: 1, cancelDate: 1}` will benefit the standalone queries shown earlier in the post but not the `$facet`-based pipeline. This is a known MongoDB limitation and not an error in the post.
- If either facet sub-pipeline matches zero documents, `$count` produces no output document, causing `$arrayElemAt` to return `null`. The subsequent `$divide` would then produce `null` rather than a numeric churn rate. Production code should handle this edge case with `$ifNull`, but for a tutorial demonstrating the concept this is acceptable.
- The sample data block uses MongoDB shell constructors (`ObjectId`, `ISODate`) inside a JSON-tagged code block. This is a widespread convention in MongoDB tutorials and documentation, so it is not flagged as an error.
