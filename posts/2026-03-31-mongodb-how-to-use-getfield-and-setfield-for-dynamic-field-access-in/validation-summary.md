# Validation Summary: How to Use $getField and $setField in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Framework
- `$getField` operator
- `$setField` operator
- `$$REMOVE` system variable
- `$concat`, `$divide`, `$multiply` aggregation expressions

## Sources Consulted
- MongoDB official documentation: `$getField` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/)
- MongoDB official documentation: `$setField` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/)
- MongoDB official documentation: Aggregation pipeline stages `$project`, `$addFields`, `$replaceRoot` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/)
- MongoDB official documentation: System variables `$$ROOT`, `$$CURRENT`, `$$REMOVE` (https://www.mongodb.com/docs/manual/reference/aggregation-variables/)

## Issues Found
No technical issues found.

## Review Notes
- The post does not mention that `$getField` and `$setField` were introduced in MongoDB 5.0. Readers on older versions may encounter errors. This could be noted in a future update.
- The "Combining $getField and $setField" example produces a `result` field containing a copy of the entire document plus the new `computed_value` field, which means the output has nested duplication. While technically correct, a `$replaceRoot` stage (as shown in earlier examples) would typically follow to flatten the result in production use.
- The locale example uses a JavaScript variable (`const locale = "fr"`) which is resolved by mongosh before the pipeline is sent to the server. This is correct but worth noting that this approach only works in mongosh/driver contexts, not in stored pipelines like `$merge` views.
