# Validation Summary: How to Use $skip and $limit for Pagination in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$skip`, `$limit`, `$sort`, `$facet`, `$match`, `$group`, `$sample`, `$count`, `$addFields`, `$unset`, `$arrayElemAt`)
- Offset-based pagination pattern
- Cursor-based (keyset) pagination pattern
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB official documentation: $skip aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip/)
- MongoDB official documentation: $limit aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/)
- MongoDB official documentation: $facet aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/)
- MongoDB official documentation: $unset aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/)
- MongoDB official documentation: $sample aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/)
- MongoDB official documentation: $arrayElemAt expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/)

## Issues Found
- **Inconsistent variable name in cursor-based pagination example**: The variable was declared as `lastId` but referenced as `lastSeenId` later in the same code block. Fixed by renaming the declaration to `lastSeenId` to match the usage in the `$match` condition.

## Review Notes
- All aggregation pipeline stage syntax is correct and uses current, non-deprecated APIs.
- The `$sort` before `$skip` before `$limit` ordering is correctly demonstrated throughout.
- The `$facet` pattern for retrieving both data and total count in a single query is accurate, including the correct use of `$arrayElemAt` to extract the scalar count from the metadata array.
- The performance degradation explanation for `$skip` is accurate — it must scan and discard all preceding documents.
- The cursor-based pagination alternative is correctly presented as the superior approach for deep pagination.
- The advice to place `$match` before `$skip`/`$limit` is correct both for correctness (filtering the right dataset) and performance (reducing documents processed).
- The compound index example `{ active: 1, createdAt: -1 }` is appropriate for the query patterns shown.
