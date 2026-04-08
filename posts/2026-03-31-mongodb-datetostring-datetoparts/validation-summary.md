# Validation Summary: How to Use $dateToString and $dateToParts in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$dateToString` aggregation operator
- `$dateToParts` aggregation operator
- `$year`, `$month`, and other date extraction operators
- ISO 8601 date handling in MongoDB

## Sources Consulted
- MongoDB official documentation: `$dateToString` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB official documentation: `$dateToParts` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/
- MongoDB official documentation: Date expression operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/#date-expression-operators
- ISO 8601 week date calendar (for verifying isoWeek and isoDayOfWeek values for 2026-03-31)

## Issues Found

1. **Example 5 output missing null group**: The input data includes a document with `timestamp: null`. Since `$dateToString` without `onNull` returns `null` for null dates, the `$group` stage produces a group with `_id: null, count: 1`. The output was missing this entry. Fixed by adding `{ _id: null, count: 1 }` as the first element (null sorts before strings with `$sort: { _id: 1 }`).

2. **Example 6 output missing doc 3**: The `$dateToParts` operator returns `null` when the input date is null. The output omitted document 3 (`_id: 3, event: "Archive"`). Fixed by adding the missing document with `parts: null`.

## Review Notes
- All format specifiers (`%Y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%L`, `%Z`, `%z`) are correct per MongoDB documentation.
- The `$dateToString` and `$dateToParts` syntax blocks are accurate.
- ISO 8601 values in Example 8 are correct: 2026-03-31 is a Tuesday (isoDayOfWeek: 2) in ISO week 14.
- Example 7 is titled "$dateToParts Components for Filtering" but actually uses `$year`/`$month` direct operators instead of `$dateToParts`. The accompanying note clarifies this is intentional, showing simpler alternatives. This is acceptable but slightly misleading in the title.
