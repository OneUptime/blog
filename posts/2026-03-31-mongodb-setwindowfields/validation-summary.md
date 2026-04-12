# Validation Summary: How to Use $setWindowFields for Window Functions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Pipeline
- `$setWindowFields` stage
- Window functions (`$sum`, `$avg`, `$rank`, `$denseRank`, `$documentNumber`, `$shift`)
- Range-based and document-based windows
- `$dateTrunc` (MongoDB 5.0+)

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/)
- MongoDB official documentation: Window function operators (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window-operators)
- MongoDB official documentation: `$shift` operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/)
- MongoDB official documentation: `$rank` operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/)
- MongoDB official documentation: Range-based window specification (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#range-window)

## Issues Found
1. **Time-Range Window: incompatible `unit` with numeric sortBy field** — The original code converted `saleDate` to milliseconds using `$toLong` (producing a numeric Long field), then sorted by that numeric field, but specified `unit: "millisecond"` in the range window. The `unit` parameter requires the `sortBy` field to be a Date type, not a number. This would cause a MongoDB error at runtime. **Fix:** Replaced the entire example to sort directly by the `saleDate` Date field and use `range: [-7, 0]` with `unit: "day"`, which is the idiomatic and correct approach for time-range windows. Removed the unnecessary `$addFields` stage that converted the date to milliseconds.

## Review Notes
- The "Multiple Outputs in One Stage" example includes `$rank` alongside other windowed operators. The rank uses the stage-level `sortBy: { saleDate: 1 }`, so documents are ranked by date ascending (not by amount). This is technically correct code but readers may expect ranking by amount as in the dedicated ranking example. Not changed since the code is valid as-is.
- The Available Window Operators table covers the most commonly used operators but is not exhaustive. Operators like `$expMovingAvg`, `$linearFill`, `$locf`, `$covariancePop`, `$covarianceSamp`, `$addToSet`, `$push`, `$top`, `$bottom`, etc. are omitted. This is acceptable for a tutorial-style post.
- All other code examples (`$sum` running totals, `$avg` moving averages, `$rank`/`$denseRank`, `$documentNumber`, `$shift` for lag/lead, cumulative count, `$group` + `$setWindowFields` pipeline) are syntactically correct and use current, non-deprecated APIs.
