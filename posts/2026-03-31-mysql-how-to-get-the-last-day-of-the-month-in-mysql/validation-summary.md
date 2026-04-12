# Validation Summary: How to Get the Last Day of the Month in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LAST_DAY() date function)
- SQL (date arithmetic, DATE_FORMAT, DATEDIFF, MAKEDATE, QUARTER)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_last-day
- MySQL 8.0 Reference Manual — DATE_FORMAT: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — MAKEDATE: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_makedate
- MySQL 8.0 Reference Manual — Date Arithmetic: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-add

## Issues Found
No technical issues found.

## Review Notes
- The "Filtering for Month-End Records" section states two queries are "Equivalent." This is true when `txn_date` is a DATE column, but if the column were DATETIME, the `txn_date = LAST_DAY(txn_date)` form would only match rows with a midnight time component, while the `DAY()` comparison would match any time on the last day. Since the column is consistently used as a DATE throughout the post, this is not an error, but readers working with DATETIME columns should be aware of the distinction.
- The `DATE_FORMAT(NOW(), '%Y-%m-01')` call returns a string, not a DATE. MySQL implicitly converts it in date contexts (e.g., BETWEEN), so it works correctly in the examples shown, but readers should know the return type is VARCHAR.
- The quarter boundary calculation was verified for all four quarters (Q1→March 31, Q2→June 30, Q3→September 30, Q4→December 31) and is correct.
- All leap year examples are accurate (2024 is a leap year, 2023 is not).
