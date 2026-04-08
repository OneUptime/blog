# Validation Summary: How to Use $dateDiff in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Framework
- `$dateDiff` aggregation operator
- Related operators: `$project`, `$match`, `$expr`, `$addFields`, `$switch`

## Sources Consulted
- MongoDB $dateDiff documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- Manual verification of all date arithmetic calculations

## Issues Found
- **`startOfWeek` syntax comment was misleading**: The comment `"monday" | "sunday" (for week unit)` used pipe syntax implying only two valid values. MongoDB accepts any day of the week (monday through sunday). Changed to `any day e.g. "monday", "sunday" (for week unit)` to clarify these are examples, not an exhaustive list.

## Review Notes
- All date calculations were manually verified and are correct (days, months for all input documents and the mermaid diagram).
- The claim that `$dateDiff` returns a signed integer (negative when endDate < startDate) is accurate per MongoDB documentation.
- The claim about MongoDB 5.0+ availability is correct.
- All aggregation pipeline syntax (`$project`, `$match` with `$expr`, `$addFields`, `$switch`) is correct and idiomatic.
- The calendar-aware behavior description (January 31 to February 28 = 1 month) is accurate.
- The valid unit strings listed in the syntax section are all correct and complete.
