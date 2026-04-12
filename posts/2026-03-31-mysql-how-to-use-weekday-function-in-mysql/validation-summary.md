# Validation Summary: How to Use WEEKDAY() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (WEEKDAY(), DAYOFWEEK(), ELT(), MID(), DATE_ADD(), DATEDIFF(), CURDATE(), NOW())
- SQL date and time functions
- ISO 8601 weekday conventions

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_weekday
- MySQL 8.0 Reference Manual — DAYOFWEEK(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofweek
- MySQL 8.0 Reference Manual — String Functions (ELT, MID): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- ISO 8601 weekday numbering conventions
- Calendar verification of 2024-01-01 (Monday), 2024-01-06 (Saturday), 2024-01-07 (Sunday), 2024-12-31 (Tuesday)

## Issues Found
1. **Broken business days formula in "Calculating Business Days Between Two Dates" section.** The MID()-based lookup formula had three errors:
   - **Wrong lookup string**: Was `'0123444401234444012344440123444401234444'` (40 characters). Should be a 7×7 = 49-character grid encoding partial-week business day counts for all (start_weekday, end_weekday) combinations. Corrected to `'0123444401233334012222340111123400012345001234550'`.
   - **Wrong position multiplier**: Used `WEEKDAY(...) * 5` but should be `WEEKDAY(...) * 7` since the grid has 7 columns per row.
   - **Wrong extraction length**: `MID(..., pos, 5)` extracted 5 characters instead of 1. The lookup returns a single digit (0–5), so the third argument must be `1`.
   - **Impact**: The original formula would return nonsensical results (e.g., 12604 instead of 261 for the example dates) because MySQL implicitly converts the 5-character substring to an integer.

## Review Notes
- The post correctly notes that the business days formula does not account for holidays and recommends a calendar table for production use — this caveat is appropriate.
- All date examples were verified against the actual 2024 calendar and are correct.
- The WEEKDAY() vs DAYOFWEEK() comparison is accurate.
- The ELT() mapping pattern (WEEKDAY() + 1) correctly accounts for ELT()'s 1-based indexing.
- The next business day CASE logic correctly handles all seven weekdays, including the Sunday edge case falling into the ELSE branch.
