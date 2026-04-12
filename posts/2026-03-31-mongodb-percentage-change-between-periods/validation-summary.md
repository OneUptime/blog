# Validation Summary: How to Calculate Percentage Change Between Periods in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- MongoDB Node.js driver
- JavaScript (ES6+)

## Sources Consulted
- MongoDB Aggregation Pipeline Stages documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB `$cond` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB `$facet` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB `$divide` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/
- MongoDB `$arrayElemAt` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB `$addFields` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
- MongoDB Index documentation: https://www.mongodb.com/docs/manual/indexes/

## Issues Found
- **Incorrect terminology in Overview**: The overview described `$cond` and `$divide` as "stages" alongside `$group`. In MongoDB's aggregation framework, `$group` is a pipeline stage, but `$cond` and `$divide` are aggregation expressions/operators used within stages. Fixed the sentence to distinguish between stages (`$group`, `$project`) and expressions (`$cond`, `$divide`).

## Review Notes
- The `$facet`-based single-pipeline approach does not guard against division by zero if `previousTotal` is exactly 0. In the application-code approach, the `computeChange` function correctly handles this case by returning `null`. For sale amounts this is unlikely to occur in practice, but a production implementation could wrap the `$divide` in a `$cond` to check for zero.
- All aggregation operators and pipeline stages used are current and non-deprecated.
- The compound index `{ type: 1, occurredAt: -1 }` is well-suited for the queries shown, supporting both the equality match on `type` and the range filter on `occurredAt`.
