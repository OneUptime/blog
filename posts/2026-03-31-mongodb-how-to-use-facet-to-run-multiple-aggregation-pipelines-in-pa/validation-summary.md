# Validation Summary: How to Use $facet to Run Multiple Aggregation Pipelines in Parallel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$facet` aggregation stage
- `$match`, `$sort`, `$skip`, `$limit`, `$count`, `$group`, `$project` pipeline stages
- `$bucket` aggregation stage
- `$sortByCount` aggregation stage
- `$text` search operator
- `$arrayElemAt` aggregation expression
- `$dateToString` aggregation expression
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation on `$facet`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB official documentation on `$bucket`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB official documentation on `$text`: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation on `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB official documentation on `$sortByCount`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/
- MongoDB official documentation on aggregation pipeline limits: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/

## Issues Found
No technical issues found.

## Review Notes
- The title and description use the word "parallel" / "simultaneously" to describe `$facet` sub-pipeline execution. While MongoDB's documentation describes sub-pipelines as "independent," the actual execution strategy (truly parallel vs sequential) is an implementation detail. This phrasing is common in MongoDB ecosystem content and is not misleading.
- The limitations section correctly lists the main restricted stages (`$facet`, `$out`, `$merge`) but does not mention `$collStats` or `$indexStats`, which are also prohibited. The post does not claim to be exhaustive, so this is acceptable.
- All seven code examples use correct MongoDB aggregation syntax and would work as described against appropriate collections.
