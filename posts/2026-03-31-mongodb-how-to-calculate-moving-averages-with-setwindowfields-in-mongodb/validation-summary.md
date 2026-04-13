# Validation Summary: How to Calculate Moving Averages with $setWindowFields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+
- MongoDB Aggregation Pipeline (`$setWindowFields` stage)
- `$avg` window function operator
- Document-based and range-based window boundaries
- `partitionBy` for per-group calculations

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/)
- MongoDB official documentation: `$avg` window operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/)
- MongoDB official documentation: Window function expressions and window boundaries (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window)

## Issues Found

1. **Description claimed "weighted moving averages" but post only covers simple moving averages.**
   - **What was wrong:** The description line stated "Learn how to calculate simple and weighted moving averages" but the post contains no examples or explanation of weighted moving averages (e.g., exponential or linearly weighted). All examples use `$avg` which computes a simple (equal-weight) average.
   - **What was changed:** Removed "simple and weighted" and replaced with just "moving averages" in the description.
   - **Why:** The description should accurately reflect the post content. Claiming weighted moving averages are covered when they are not is misleading.

2. **Centered moving average note incorrectly stated results "may not be available" for edge documents.**
   - **What was wrong:** The note said "results may not be available for the last few documents in a stream." In reality, MongoDB still computes and returns a result for every document; for edge documents the window simply contains fewer documents than specified, producing a partial-window average.
   - **What was changed:** Reworded to: "For the last few documents in a partition, the window will contain fewer documents than specified, so the average is computed over a partial window."
   - **Why:** The original wording implied MongoDB would return null or omit those documents, which is incorrect. MongoDB always produces a result for `$avg` over the available window documents.

## Review Notes
- All sample output calculations were manually verified and are correct (including the rounded values 111.67 and 113.33).
- All `$setWindowFields` syntax (sortBy, partitionBy, documents window, range window with unit) is correct per MongoDB 5.0+ documentation.
- The aggregation operators used in subsequent `$project` stages (`$cond`, `$gt`, `$abs`, `$subtract`, `$multiply`) are all used with correct syntax.
- The range-based window example correctly uses `unit: "day"` which is a valid time unit for range windows.
- The post does not cover exponential moving averages (EMA) or weighted moving averages (WMA), which would require `$expMovingAvg` or custom `$reduce` expressions. This is fine since the title specifically says "$setWindowFields" and $avg, but could be noted for future expansion.
