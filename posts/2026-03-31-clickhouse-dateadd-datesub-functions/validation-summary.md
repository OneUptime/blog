# Validation Summary: How to Use dateAdd() and dateSub() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL date/time functions)
- `dateAdd()` / `dateSub()` functions
- `toDate()`, `toDateTime()`, `now()`, `today()` helper functions
- `arrayJoin()`, `range()` array functions

## Sources Consulted
- ClickHouse official documentation for date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `dateAdd` / `date_add` / `timestampAdd` function reference
- ClickHouse `dateSub` / `date_sub` / `timestampSub` function reference
- ClickHouse `range()` and `arrayJoin()` documentation
- ClickHouse behavior around month-end date arithmetic (addMonths/subtractMonths clamping semantics)

## Issues Found
No technical issues found.

Verified the following claims:
- Function signature `dateAdd(unit, value, date)` and `dateSub(unit, value, date)` matches the official documentation (unit as first argument, signed integer value, date/datetime as third).
- The listed unit strings (`'second'`, `'minute'`, `'hour'`, `'day'`, `'week'`, `'month'`, `'quarter'`, `'year'`) are all supported.
- Return type matches input type for Date/DateTime (ClickHouse preserves the input temporal type for typical cases used in the examples).
- Negative `n` on `dateAdd` is equivalent to `dateSub` (the two are symmetric).
- Month-end clamping: `dateAdd('month', 1, toDate('2026-01-31'))` returns `2026-02-28` — 2026 is not a leap year (not divisible by 4), so Feb 28 is correct. `dateAdd('month', 2, toDate('2026-01-31'))` returns `2026-03-31`. `dateAdd('month', 1, toDate('2026-02-28'))` returns `2026-03-28` — ClickHouse preserves the day-of-month when valid.
- `range(0, 30)` produces `[0, 1, ..., 29]` (end-exclusive), yielding 30 values — matches the "series of 30 days" intent of the example.
- ClickHouse allows referencing column aliases (e.g., `trial_expiry`) in `WHERE` clauses — the example is valid.
- `count(CASE WHEN ... THEN 1 END)` counts non-NULL values; the implicit `ELSE NULL` makes this an idiomatic way to count conditional rows in ClickHouse.

## Review Notes
- The description line mentions "DateTime values" but the functions also work with `Date` values (as the body of the post correctly describes and demonstrates). This is a minor copy-level nuance rather than a technical error.
- ClickHouse also accepts the `unit` argument as an unquoted keyword (e.g., `dateAdd(MONTH, 1, ...)`) and via the `INTERVAL` syntax (`dateAdd(date, INTERVAL 1 MONTH)`); the post sticks to the quoted-string form, which is valid and widely used.
- Aliases `date_add`, `DATE_ADD`, `timestampAdd` (and their `Sub` counterparts) exist for MySQL/standard-SQL compatibility — not mentioned in the post, but not required for correctness.
- When adding sub-day units (`second`, `minute`, `hour`) to a `Date` value, ClickHouse may promote the result to `DateTime`. The examples in the post pair sub-day units with `DateTime` inputs, so this edge case does not surface.
