# Validation Summary: How to Use $isoDayOfWeek, $isoWeek, and $isoWeekYear in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$isoDayOfWeek`, `$isoWeek`, `$isoWeekYear` date operators
- ISO 8601 week-based calendar standard

## Sources Consulted
- MongoDB Manual: `$isoDayOfWeek` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoDayOfWeek/
- MongoDB Manual: `$isoWeek` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeek/
- MongoDB Manual: `$isoWeekYear` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeekYear/
- MongoDB Manual: `$dayOfWeek` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dayOfWeek/
- MongoDB Manual: `$expr` — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- ISO 8601 week date definition — https://en.wikipedia.org/wiki/ISO_week_date

## Issues Found
No technical issues found.

## Review Notes
- The example date of `2026-03-30T10:00:00Z` was manually verified to be a Monday (ISO day 1) in ISO week 14 of 2026. Calculation: Jan 1, 2026 is a Thursday; 88 days later is Monday. ISO Week 1 starts Dec 29, 2025; 91 days from that start gives week 14.
- The `$arrayElemAt` mapping trick with a leading empty string to align 0-based array indexing with 1-based `$isoDayOfWeek` output is a clean, correct pattern.
- The advice to always pair `$isoWeek` with `$isoWeekYear` (not `$year`) is an important best practice that is correctly emphasized throughout the post.
- All aggregation pipeline syntax is correct and follows current MongoDB conventions.
