# Validation Summary: How to Build an Engagement Score in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework (`$match`, `$project`, `$group`, `$sort`, `$switch`, `$exp`, `$merge`)
- MongoDB Indexing (`createIndex`)
- MongoDB Shell (mongo shell syntax with `ISODate`, `ObjectId`)

## Sources Consulted
- MongoDB `$switch` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
- MongoDB `$exp` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/exp/
- MongoDB `$project` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB `$group` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$merge` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB `$subtract` with dates documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/

## Issues Found
1. **Missing `timestamp` field in `$project` stage (first pipeline)**: The `$project` stage only projected `userId` and `eventWeight`, which drops all other fields including `timestamp`. The subsequent `$group` stage used `$max: "$timestamp"` for the `lastActive` field, but since `timestamp` was excluded by `$project`, it would always resolve to `null`. Fixed by adding `timestamp: 1` to the `$project` stage.

2. **Incorrect code fence language for sample data**: The sample data block used ` ```json ` but contained `ObjectId()` and `ISODate()` which are MongoDB shell constructors, not valid JSON. Changed to ` ```javascript ` to accurately reflect the syntax.

## Review Notes
- The recency decay pipeline uses `new Date("2025-11-01T00:00:00Z")` as a hardcoded reference date. This works in the mongo shell where JavaScript is evaluated, but in application code using a MongoDB driver, you would need to use the driver's date type or pass the current date as a variable. This is acceptable for a tutorial context.
- The recency decay example only includes three event types (`purchase`, `comment`, `page_view`) in its `$switch` branches compared to six in the first example. This is intentional as a simplified demonstration, with `default: 1` catching remaining types.
- All MongoDB aggregation operators used (`$switch`, `$exp`, `$merge`) are available since MongoDB 4.2+, which is current and non-deprecated.
