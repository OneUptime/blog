# Validation Summary: How to Calculate Monthly Active Users in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipeline
- MongoDB `$group`, `$addToSet`, `$size`, `$match`, `$project`, `$sort` stages
- MongoDB `$dateToString`, `$year`, `$month`, `$concat`, `$toString` operators
- `allowDiskUse` option for large aggregations
- MongoDB compound indexes

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$addToSet` accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/
- MongoDB `$group` stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$month` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/month/ (returns integer 1-12, not zero-padded)
- MongoDB `$dateToString` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB `allowDiskUse`: https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/

## Issues Found
- **Incorrect sort order in "Filtering by Event Type" example**: The pipeline sorted by `{ period: 1 }` where `period` is a string built via `$concat` of year and month (e.g., `"2025-1"`, `"2025-10"`). Since `$month` returns integers 1-12 (not zero-padded), lexicographic string sorting would produce incorrect chronological order: `"2025-1"`, `"2025-10"`, `"2025-11"`, `"2025-12"`, `"2025-2"`, `"2025-3"`, etc. **Fix:** Changed the sort to `{ "_id.year": 1, "_id.month": 1 }` to sort on the numeric fields, which produces correct chronological order. This is consistent with the approach used in the "Basic MAU Calculation" example.

## Review Notes
- The `period` field in the "Filtering by Event Type" example still produces non-zero-padded month strings (e.g., `"2025-3"` instead of `"2025-03"`). This is cosmetic and doesn't affect correctness now that sorting uses numeric fields. A future improvement could use `$dateToString` with `"%Y-%m"` format for cleaner display strings.
- The introduction says MongoDB can compute MAU "using `$group` with `$addToSet` or `$dateToString`." This reads as if `$dateToString` is an alternative to `$addToSet` for counting unique users, when in fact `$dateToString` is only used for date formatting in the group key. The phrasing is slightly ambiguous but not technically incorrect.
- The recommended compound index `{ timestamp: 1, event: 1, userId: 1 }` is reasonable. For queries that filter primarily on `event` type with a date range, an `{ event: 1, timestamp: 1, userId: 1 }` order could also be considered depending on query selectivity, but the current recommendation is valid.
