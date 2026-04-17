# Validation Summary: How to Use addDays(), addMonths(), addYears() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse date/time functions (`addDays`, `addWeeks`, `addMonths`, `addQuarters`, `addYears`, `addHours`, `addMinutes`, `addSeconds`, `subtractDays`, `dateAdd`, `dateDiff`, `toStartOfDay`, `toDate`, `now`, `today`, `arrayJoin`, `range`)

## Sources Consulted
- ClickHouse official documentation on date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs for `addDays` / `addMonths` / `addYears` (signature `addDays(date, num)`)
- ClickHouse docs for `dateAdd` (signature `dateAdd(unit, value, date)`)
- ClickHouse docs for `dateDiff` (signature `dateDiff(unit, startdate, enddate)`)
- ClickHouse docs for `range()` array function (`range(end)` / `range(start, end [, step])` — end-exclusive)
- ClickHouse docs for `arrayJoin`, `toStartOfDay`, `subtractDays`, `now`, `today`

## Issues Found
No technical issues found.

Verified points:
- The `addDays(dt, n)` ↔ `dateAdd('day', n, dt)` equivalence is correct — `dateAdd` in ClickHouse takes `(unit, value, date)` in that order, and the shorthand functions take `(date, num)`.
- All listed shorthand functions (`addDays`, `addWeeks`, `addMonths`, `addQuarters`, `addYears`, `addHours`, `addMinutes`, `addSeconds`) exist in ClickHouse.
- Calendar-aware clamping claim is correct: `addMonths(toDate('2026-01-31'), 1)` returns `2026-02-28` (ClickHouse clamps to the last valid day of the target month; 2026 is not a leap year).
- `range(0, 12)` correctly produces `[0, 1, ..., 11]` (end-exclusive).
- `subtractDays(now(), 30)` is equivalent to `addDays(now(), -30)`.
- `dateDiff('day', today(), addDays(signup_date, 14))` uses the correct argument order.
- All SQL examples are syntactically valid ClickHouse SQL.

## Review Notes
- Minor nuance not called out in the post: when `addHours`, `addMinutes`, or `addSeconds` is applied to a `Date` value, the result is implicitly promoted to `DateTime`, so the blanket statement "return the same type as their input" is strictly accurate only for the day/week/month/quarter/year variants. This is a small oversimplification rather than an error, and does not affect any of the code examples in the post (all of which pass `DateTime` or `Date` to day/month/year variants).
- The `CROSS JOIN` + alias-in-`WHERE` pattern in the "Generating a Renewal Calendar" example relies on ClickHouse's alias-in-WHERE support, which works under the default/new analyzer in current ClickHouse versions. Worth noting only if a reader is on a very old server with strict alias resolution.
