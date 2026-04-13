# Validation Summary: How to Format Dates as Strings in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$dateToString` aggregation operator
- BSON Date type

## Sources Consulted
- MongoDB official documentation for `$dateToString`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB date expression operators reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/#date-expression-operators

## Issues Found
- **`%S` second range incorrect**: The format specifiers table listed `%S` (Second) with a range of `(00-60)`. MongoDB's `$dateToString` documentation specifies the valid range as `(00-59)`. The 00-60 range is a POSIX/C convention to accommodate leap seconds, but MongoDB does not support leap seconds in its date formatting. Fixed the range to `(00-59)`.

## Review Notes
- All code examples use correct `$dateToString` syntax and would execute successfully in `mongosh`.
- The `timezone` parameter correctly uses an Olson timezone identifier (`"America/New_York"`).
- The `onNull` parameter usage is accurate for handling missing or null date fields.
- The grouping example using `$dateToString` inside `$group._id` is a valid and common pattern.
- The post covers `$dateToString` well but omits some less common format specifiers like `%j` (day of year), `%w` (day of week), `%U` (week of year), and `%Z` (timezone offset). This is fine for a focused tutorial but could be noted in a future update.
