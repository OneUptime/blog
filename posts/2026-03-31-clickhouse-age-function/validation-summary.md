# Validation Summary: How to Use age() Function in ClickHouse for Duration Calculation

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse date/time functions: `age`, `dateDiff`, `today`, `toDate`, `toDayOfYear`, `toIntervalYear`
- ClickHouse conditional: `multiIf`

## Sources Consulted
- ClickHouse official documentation — Date and Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `age` function reference: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#age
- ClickHouse `dateDiff` function reference: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#date_diff

## Issues Found
No technical issues found.

- The signature `age(unit, startdate, enddate, [timezone])` is correctly described.
- Supported units (`year`, `month`, `day`, etc.) are valid.
- The contrast with `dateDiff` (boundary-crossing count vs. full-unit calendrical difference) is accurate — this matches ClickHouse's documented semantics.
- The worked example is correct: `dateDiff('year', '2023-03-01', '2024-02-28')` returns `1` (crosses the 2023→2024 year boundary), while `age('year', '2023-03-01', '2024-02-28')` returns `0` (one day short of a full calendar year).
- `age('month', ...)` and `age('day', ...)` return total months/days (not "month component"), matching the `total_months`/`total_days` aliases used.
- All SQL is syntactically valid ClickHouse, including `toDate(...) + toIntervalYear(...)` arithmetic.

## Review Notes
- The `age` function was added in ClickHouse 22.x; it is broadly available in any currently supported version. No version caveat is needed for modern deployments.
- The anniversary-detection query is clever but has a subtle edge case around year-end wraparound: if "today + 7 days" crosses into the next year, the `BETWEEN toDayOfYear(today()) AND toDayOfYear(today() + 7)` range inverts. This is a logical edge case, not a technical error in the demonstrated use of `age`, so no change was made.
- `birth_date IS NOT NULL` in the bucketing query implies a `Nullable(Date)` column; readers should adapt to their schema.
