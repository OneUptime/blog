# Validation Summary: How to Get the First Day of the Week in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (date and time functions)
- SQL (date arithmetic, filtering, aggregation)
- ISO 8601 week numbering standard

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — DATE_FORMAT format specifiers (covers %x, %v, %u, %w): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- ISO 8601 week date definition (Monday as first day of week, week 1 contains first Thursday of year)
- Independent date arithmetic verification using Python datetime for all example dates

## Issues Found

### Issue 1: Incorrect format specifier reference in text (line 79)
- **What was wrong:** The introductory text for the "First Day of a Specific Week Number" section said "combine `STR_TO_DATE()` with `%u`" but the code actually uses `%v`. The `%u` specifier is WEEK() mode 1 (Monday-start, range 00-53), which is NOT the ISO week. The `%v` specifier is WEEK() mode 3 (ISO week, Monday-start, range 01-53), which is what the code correctly uses.
- **What was changed:** Replaced `%u` with `%v` in the text.
- **Why:** The text was misleading — `%u` and `%v` produce different results at year boundaries. The code was correct; only the prose was wrong.

### Issue 2: Off-by-one error in "more reliable" week-number formula (lines 92-98)
- **What was wrong:** The formula `(1 - WEEKDAY(MAKEDATE(2026, 1)))` produces an offset that is 1 day too large. Since `WEEKDAY()` returns 0 for Monday, using `1 - WEEKDAY(...)` adds an extra day, yielding Tuesday (2026-03-03) instead of Monday (2026-03-02) for ISO week 10.
- **What was changed:** Changed `+ (1 - WEEKDAY(MAKEDATE(2026, 1)))` to `- WEEKDAY(MAKEDATE(2026, 1))`. This correctly subtracts the weekday offset to land on Monday.
- **Why:** Verified by computing: MAKEDATE(2026,1) = Jan 1 (Thursday, WEEKDAY=3). Original: (10-1)*7 + (1-3) = 61 days from Jan 1 = March 3 (Tuesday). Fixed: (10-1)*7 - 3 = 60 days from Jan 1 = March 2 (Monday, confirmed as ISO week 10 Monday).

## Review Notes
- All other code examples (Monday-based first day, Sunday-based first day, column application, week-to-date filtering, weekly aggregation, year-end boundary handling) are technically correct with verified date arithmetic.
- The `STR_TO_DATE('2026 10 1', '%x %v %w')` example works correctly in MySQL 8.0 but behavior of `%w` in `STR_TO_DATE` context can vary across older MySQL versions, as the post already notes.
- The post correctly notes that `WEEKDAY()`-based date arithmetic handles year-end boundaries properly (2026-01-01 correctly maps back to 2025-12-29 Monday).
- The `DAYOFWEEK()` return values (1=Sunday through 7=Saturday) and `WEEKDAY()` return values (0=Monday through 6=Sunday) are accurately described throughout.
