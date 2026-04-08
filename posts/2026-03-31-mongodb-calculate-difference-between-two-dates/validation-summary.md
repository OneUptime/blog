# Validation Summary: How to Calculate the Difference Between Two Dates in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$dateDiff` aggregation operator
- `$subtract` aggregation operator
- `$divide` aggregation operator
- `$match` with `$expr` for filtering by computed values
- `$$NOW` system variable

## Sources Consulted
- MongoDB $dateDiff documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/
- MongoDB $subtract documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB aggregation system variables ($$NOW): https://www.mongodb.com/docs/manual/reference/aggregation-variables/

## Issues Found
No technical issues found.

All code examples are syntactically correct and use proper MongoDB aggregation pipeline syntax:
- `$dateDiff` correctly uses `startDate`, `endDate`, and `unit` as required fields, with `timezone` as an optional field.
- Valid unit values are used throughout: `"minute"`, `"year"`, `"day"`.
- `$subtract` on two Date fields correctly returns milliseconds, and the division constants (1000 for seconds, 60000 for minutes) are accurate.
- The `$match` + `$expr` pattern for filtering by computed date differences is correct.
- The `timezone` parameter in `$dateDiff` correctly accepts IANA timezone strings.
- `$$NOW` is a valid system variable available in aggregation pipelines.

## Review Notes
- `$dateDiff` truncates rather than rounds — e.g., 59 minutes returns 0 hours. This is worth noting but not an error in the post since it correctly states it "returns the integer difference."
- The `$subtract` approach returns a NumberLong (milliseconds), not a Date, when both operands are dates. The post correctly describes this behavior.
