# Validation Summary: How to Use DATE_ADD() and DATE_SUB() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (DATE_ADD, DATE_SUB, ADDDATE, SUBDATE functions)
- SQL date/datetime arithmetic
- INTERVAL expression syntax (simple and compound units)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-add
- MySQL 8.0 Reference Manual — Temporal Intervals: https://dev.mysql.com/doc/refman/8.0/en/expressions.html#temporal-intervals

## Issues Found
No technical issues found.

All date arithmetic results were verified manually:
- Simple interval additions and subtractions produce correct dates.
- Month-end clamping behavior is accurately described (e.g., Jan 31 + 1 month → Feb 28 in non-leap year 2026; Jan 31 + 3 months → Apr 30).
- Compound interval formats (HOUR_MINUTE with '2:30', YEAR_MONTH with '1-6', DAY_HOUR with '2 12') use correct syntax and produce correct results.
- The equivalence of DATE_SUB(d, INTERVAL n UNIT) and DATE_ADD(d, INTERVAL -n UNIT) is correctly stated.
- ADDDATE/SUBDATE alias behavior, including ADDDATE's integer shorthand for days, is accurate.
- NULL propagation behavior is correct.
- The supported INTERVAL units table is complete and uses correct format strings.

## Review Notes
None.
