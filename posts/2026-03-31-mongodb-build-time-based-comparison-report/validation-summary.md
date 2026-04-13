# Validation Summary: How to Build a Time-Based Comparison Report in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$facet`, `$match`, `$group`, `$project`, `$addFields`, `$cond`, `$arrayElemAt`, `$subtract`, `$divide`, `$multiply`)
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB official documentation: $facet aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/)
- MongoDB official documentation: $cond aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/)
- MongoDB official documentation: $addFields aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/)
- MongoDB official documentation: $group aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/)
- MongoDB official documentation: $arrayElemAt aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/)
- MongoDB official documentation: createIndex (https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)

## Issues Found
No technical issues found.

## Review Notes
- The percentage change calculation (`changePct`) will produce an error if `previousRevenue` is 0 or null (division by zero). This is a robustness consideration rather than a technical error -- the code is syntactically and logically correct for the normal case. Authors could optionally wrap the division in a `$cond` to handle the zero case.
- The `$facet` output is subject to the 16MB BSON document size limit, which is worth noting for very large aggregations but is not an error in the post.
- The pipeline correctly places the initial `$match` before `$facet` so that the `saleDate` index is utilized. The `$match` stages inside `$facet` sub-pipelines cannot leverage indexes, but the pre-filtering ensures only the relevant 2-month window enters the facet.
