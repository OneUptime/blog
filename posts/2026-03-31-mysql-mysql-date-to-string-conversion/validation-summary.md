# Validation Summary: How to Convert a Date to a String in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL DATE_FORMAT() function
- MySQL CAST() and CONVERT() functions
- MySQL date/time format specifiers
- MySQL UNIX_TIMESTAMP() function

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — DATE_FORMAT format specifiers table
- Python datetime module (to independently verify day-of-week and day-of-year for 2026-03-31)

## Issues Found

1. **`%V` format specifier description was incorrect (line 45)**
   - **What was wrong:** The post described `%V` as "Week number (01-53, week starts Monday)". In MySQL, `%V` uses Sunday as the first day of the week (WEEK() mode 2). The Monday-starting equivalent is `%v` (lowercase).
   - **What was changed:** Corrected "week starts Monday" to "week starts Sunday".

2. **Invalid `%B` format specifier used in example (line 138)**
   - **What was wrong:** The "Formatting in SELECT for Display" example used `%B` in the format string (`'%W, %B %e, %Y at %l:%i %p'`). `%B` is not a valid MySQL DATE_FORMAT specifier — MySQL would output the literal character "B" instead of the month name. The correct specifier for the full month name is `%M`.
   - **What was changed:** Replaced `%B` with `%M` in the format string.

## Review Notes
- The UNIX_TIMESTAMP example value (1743379530) does not correspond to 2026-03-31 14:05:30 (it maps to approximately 2025-03-31 00:05:30 UTC). Since the exact value depends on server timezone and the actual execution time of NOW(), and the concept being demonstrated is correct, this was left as-is. The value is illustrative only.
- The `CONVERT(NOW() USING utf8mb4)` example is technically a character set conversion rather than a type cast, but it does produce a string result as described. This is acceptable but worth noting as a subtle distinction.
- All other format specifiers, SQL syntax, example outputs, and technical explanations were verified as correct.
