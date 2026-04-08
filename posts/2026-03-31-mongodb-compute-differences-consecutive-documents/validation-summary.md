# Validation Summary: How to Compute Differences Between Consecutive Documents in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ Aggregation Framework
- `$setWindowFields` stage
- `$shift` window operator
- `$addFields`, `$project`, `$cond`, `$subtract`, `$divide`, `$round` operators

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: `$shift` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB official documentation: `$sum` (window function) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/#use-in-setwindowfields-stage

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax for `$shift` (`output`, `by`, `default` parameters) and produce the expected results.
- The `by: -1` / `by: -2` semantics are correctly explained (negative shifts backward, positive shifts forward).
- The percentage change example correctly guards against both null and zero division.
- The running cumulative sum example correctly uses `window: { documents: ["unbounded", "current"] }`.
- Performance advice about compound indexes on `partitionBy` + `sortBy` fields is sound.
- The post targets MongoDB 5.0+, which is current and not deprecated.
