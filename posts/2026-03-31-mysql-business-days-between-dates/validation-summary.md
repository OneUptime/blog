# Validation Summary: How to Calculate Business Days Between Two Dates in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (DATEDIFF, WEEKDAY, MID, LEAST, GREATEST, IF, DIV, MOD)
- MySQL stored functions (DELIMITER, CREATE FUNCTION, DETERMINISTIC)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — String Functions (MID): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual — CREATE FUNCTION: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- Manual calendar verification for March 2026 (March 1 = Sunday, March 31 = Tuesday)

## Issues Found

### 1. Step-by-Step Formula produced wrong results (Section 2)
**What was wrong:** The GREATEST/LEAST formula did not handle week wrap-around — when the end date's weekday index is less than the start date's (e.g., Sunday→Tuesday), the subtraction yielded a negative number clamped to 0, losing the remaining weekdays. For the example dates (2026-03-01 Sun → 2026-03-31 Tue), it returned 20 instead of 22.

**What was changed:** Replaced with the correct formula: `LEAST(end_wd + 1, 5) - LEAST(start_wd + 1, 5) + IF(end_wd < start_wd, 5, 0)`. This formula was verified against the lookup table for all 49 combinations of (start_weekday, end_weekday).

### 2. Stored Function CASE logic was fundamentally flawed (Section 3)
**What was wrong:** The CASE statement branched on `start_wd + remaining`, but the same sum can correspond to different numbers of weekend days depending on the individual values of `start_wd` and `remaining`. For example, `start_wd=6 + remaining=2 = 8` (0 weekend days in remainder) and `start_wd=4 + remaining=4 = 8` (2 weekend days) both hit the same CASE branch (`remaining - 2`), producing the wrong result for the Sunday start case. The function returned 20 instead of 22 for the example dates. The variable `end_wd` was declared but never used.

**What was changed:** Replaced the entire function body with the correct closed-form formula using `LEAST(end_wd + 1, 5) - LEAST(start_wd + 1, 5) + IF(end_wd < start_wd, 5, 0)`. Removed unused variables (`total_days`, `remaining`). The function now uses `end_wd` as intended.

### 3. Quick Inline Query was an inaccurate approximation (Section 4)
**What was wrong:** The inline formula `DATEDIFF + 1 - 2*(DATEDIFF DIV 7) - (WEEKDAY(end) >= 5) - (WEEKDAY(start) = 6)` only subtracted weekends from complete 7-day spans and applied minimal partial-week adjustments. It could be off by 2+ days for short ranges crossing a weekend (e.g., Friday to Monday: formula returns 4, actual weekdays = 1). The disclaimer said "may be off by 1" which understated the error.

**What was changed:** Replaced with the same exact formula used in the stored function. Removed the approximation disclaimer. Updated the surrounding text to reflect that the inline query is exact, not an approximation.

## Review Notes
- The lookup-table formula in Section 1 (the "Core Formula") was correct and unchanged. The 49-character string encodes all 7x7 weekday combinations accurately.
- The `-- 22` expected result in the usage example is correct (March 2026 has 22 business days from March 2–31).
- The CREATE TABLE / INSERT / SELECT example in "Apply to a Table" is syntactically correct and depends on the stored function being created first.
- The summary's advice about maintaining a calendar table for public holidays is sound.
- All formulas use the convention: exclusive of start_date, inclusive of end_date (matching DATEDIFF semantics).
