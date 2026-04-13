# Validation Summary: How to Calculate Moving 7-Day and 30-Day Averages in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+ aggregation framework)
- `$setWindowFields` stage
- Window functions (`$avg`, `$count`)
- Document-based and time-range-based windows
- `$lookup` (legacy self-join approach)

## Sources Consulted
- MongoDB `$setWindowFields` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$dateSubtract` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/ (confirmed introduced in 5.0)
- MongoDB `$subtract` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB `$avg` (window function) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/#use-in-setwindowfields-stage
- MongoDB `$count` (window function) documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/

## Issues Found

1. **Legacy approach used `$dateSubtract` (a MongoDB 5.0+ operator) in a section intended for pre-5.0 versions.**
   - **What was wrong:** The "Legacy Approach (pre-5.0)" section used `{ $dateSubtract: { startDate: "$$currentDate", unit: "day", amount: 6 } }`, but `$dateSubtract` was introduced in MongoDB 5.0, making it unavailable in the pre-5.0 context the section targets.
   - **What was changed:** Replaced with `{ $subtract: ["$$currentDate", 6 * 24 * 60 * 60 * 1000] }`, which uses the `$subtract` operator (available since MongoDB 2.6) with milliseconds to compute the date 6 days prior.
   - **Why:** `$subtract` with a numeric millisecond value on a Date type is the correct pre-5.0 approach for date arithmetic.

2. **Section title "Legacy Approach: $group + $lookup" was misleading.**
   - **What was wrong:** The title referenced `$group` but the pipeline only uses `$lookup` and `$project` — there is no `$group` stage.
   - **What was changed:** Renamed to "Legacy Approach: $lookup (pre-5.0)".
   - **Why:** The title should accurately describe the pipeline stages used.

3. **Partitioned Moving Averages filter used `$dayOfYear` which is incorrect for the general case.**
   - **What was wrong:** The filter `{ $gte: [{ $dayOfYear: "$date" }, 7] }` was intended to exclude rows without a full 7-day window, but `$dayOfYear` only works correctly if data starts on January 1st. For data starting on any other date, this filter would incorrectly pass records that don't have a full window.
   - **What was changed:** Added a `windowCount` output field using `$count` with the same `[-6, 0]` window, then filtered with `{ $gte: ["$windowCount", 7] }` to correctly identify rows with a full 7-document window.
   - **Why:** Counting actual documents in the window is the correct, general-purpose way to determine if a full window is available.

## Review Notes
- The `$sort` stage before `$setWindowFields` in the first example is redundant since `$setWindowFields` has its own `sortBy` clause. This is not incorrect (MongoDB will optimize it), but readers may wonder if both are needed. Left as-is since it doesn't affect correctness.
- All other `$setWindowFields` examples correctly use `partitionBy`, `sortBy`, document windows, and range windows with proper syntax.
- The distinction between document-based windows (`documents: [-6, 0]`) and time-range windows (`range: [-6, 0], unit: "day"`) is explained clearly and accurately.
