# Validation Summary: How to Use $dateDiff, $dateAdd, and $dateSubtract in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$dateDiff` aggregation operator
- `$dateAdd` aggregation operator
- `$dateSubtract` aggregation operator
- `$$NOW` system variable
- `$switch` conditional expression
- `$expr` in `$match` stages

## Sources Consulted
- MongoDB official documentation: `$dateDiff` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/
- MongoDB official documentation: `$dateAdd` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/
- MongoDB official documentation: `$dateSubtract` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/
- MongoDB official documentation: Aggregation variables (`$$NOW`) — https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB official documentation: `$switch` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
- MongoDB 5.0 release notes — https://www.mongodb.com/docs/manual/release-notes/5.0/

## Issues Found
No technical issues found.

## Review Notes
- All three operators were correctly identified as being introduced in MongoDB 5.0.
- The supported units list (`year`, `quarter`, `month`, `week`, `day`, `hour`, `minute`, `second`, `millisecond`) is complete and accurate.
- The `$dateDiff` operator also supports an optional `startOfWeek` parameter (not mentioned in the post), but omitting it is fine since the post doesn't claim to be an exhaustive API reference.
- Using field references (e.g., `"$trialDays"`) as the `amount` parameter is valid since `amount` accepts any expression that resolves to an integer.
- The `timezone` parameter correctly uses Olson timezone identifiers (e.g., `"America/New_York"`).
- All aggregation pipeline stages (`$project`, `$addFields`, `$match` with `$expr`) are used correctly.
