# Validation Summary: How to Handle Time Zones in MongoDB Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline, `$dateToString`, `$dateToParts`, `$group`)
- JavaScript / Node.js (`Date` constructor, `date-fns-tz` library)
- IANA time zone database

## Sources Consulted
- MongoDB `$dateToString` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB `$dateToParts` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/
- MongoDB Date handling: https://www.mongodb.com/docs/manual/reference/method/Date/
- `date-fns-tz` v3 migration guide and API: https://github.com/marnusw/date-fns-tz
- US DST rules (second Sunday of March): used to verify Chicago offset on March 31, 2026

## Issues Found

1. **Incorrect UTC offset for Chicago on March 31, 2026 (lines 98-106)**: The post stated Chicago is "UTC-6 in winter" for March 31, but DST begins on March 8, 2026 (second Sunday of March), so Chicago is in CDT (UTC-5) on March 31. The comment and all UTC timestamps in the filtering example were wrong by one hour. Fixed the comment to say "UTC-5, CDT" and corrected `2026-03-31T06:00:00Z` to `2026-03-31T05:00:00Z` and `2026-04-01T06:00:00Z` to `2026-04-01T05:00:00Z`.

2. **Deprecated `date-fns-tz` API (line 112)**: The post used `zonedTimeToUtc` from `date-fns-tz`, which was the v2 API. In `date-fns-tz` v3 (released 2024, aligned with date-fns v3), this function was renamed to `fromZonedTime`. Updated the import and function calls to use the current API.

3. **Off-by-subsecond end range in application-layer example (line 115)**: The post used `"2026-03-31 23:59:59"` as the end time, which would miss events occurring in the last sub-second of the day when used with `$lt`. Changed to `"2026-04-01 00:00:00"` (midnight of the next day) to match the correct `$lt` pattern already shown in the query example above it.

## Review Notes
- The MongoDB aggregation syntax (`$dateToString`, `$dateToParts`, `$group`, `$project`) is all correct and uses current, non-deprecated APIs.
- The advice to store dates in UTC and convert at read time is a well-established best practice.
- The per-document timezone field reference (`"$timezone"`) is a valid and useful pattern.
- The post could mention `$dateFromParts` and `$dateFromString` with timezone for completeness, but its current scope is appropriate.
