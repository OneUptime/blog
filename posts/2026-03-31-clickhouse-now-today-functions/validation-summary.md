# Validation Summary: How to Use now() and today() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (date and time functions)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: date-time functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation: conditional functions — https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse source code on GitHub: `src/Functions/yesterday.cpp` — https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/yesterday.cpp
- GitHub code search across the ClickHouse/ClickHouse repository for `tomorrow` function implementation (confirmed non-existent)

## Issues Found
1. **`tomorrow()` function does not exist in ClickHouse.** The post originally referenced `tomorrow()` as a built-in ClickHouse function in multiple places (description, introduction, section header, SQL examples, and summary). ClickHouse has no `tomorrow()` function — a search of the entire ClickHouse source repository found zero function implementations for it. The correct way to get tomorrow's date is `today() + 1` or `addDays(today(), 1)`. Changes made:
   - Updated the description line to remove `tomorrow()` from the function list.
   - Updated the introduction paragraph to remove `tomorrow()` from the function list.
   - Renamed the "yesterday() and tomorrow()" section to "yesterday() and Date Arithmetic".
   - Rewrote the section description to clarify that `tomorrow()` does not exist and `today() + 1` should be used instead.
   - Changed `tomorrow() AS tomorrow` to `today() + 1 AS tomorrow` in the SQL example.
   - Updated the "Filtering for Data in a Specific Future Window" section text to reference "date arithmetic" instead of `tomorrow()`.
   - Updated the Summary section to replace `tomorrow()` with `today() + 1`.

## Review Notes
- All other functions covered (`now()`, `today()`, `now64()`, `yesterday()`) are verified as correct ClickHouse built-in functions with accurate descriptions of return types and behavior.
- The `now()` description correctly states it is evaluated once per query (it is a constant expression in ClickHouse).
- The `today()` equivalence to `toDate(now())` is confirmed by official documentation.
- The `now64()` default scale of 3 and valid range of 0-9 are confirmed correct.
- The `dateDiff` function syntax and `INTERVAL` arithmetic syntax are correct.
- The `multiIf` conditional function usage is correct.
- DateTime subtraction yielding elapsed seconds as an integer is correct behavior in ClickHouse.
