# Validation Summary: How to Use YEAR() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (YEAR(), MONTH(), WEEK(), DATE_FORMAT(), STR_TO_DATE(), CURDATE(), NOW() functions)
- SQL (SELECT, WHERE, GROUP BY, UPDATE, ORDER BY)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_year
- MySQL 8.0 Reference Manual — Date and Time Literals: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-literals.html
- MySQL 8.0 Reference Manual — STR_TO_DATE: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_str-to-date
- MySQL 8.0 Reference Manual — DATE_FORMAT: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual — Optimization and Indexes: https://dev.mysql.com/doc/refman/8.0/en/mysql-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that wrapping a column in `YEAR()` in a WHERE clause prevents index usage and recommends range comparisons instead. This is an important and accurate performance tip.
- The description of `'0000-00-00'` as an "invalid date" is slightly imprecise — in MySQL it is a special "zero date" value (allowed depending on sql_mode settings like NO_ZERO_DATE and STRICT mode), not an invalid date per se. However, the functional claim that `YEAR('0000-00-00')` returns 0 is correct, and the wording is close enough to not warrant a change.
- The dynamic current-year filter example (`WHERE YEAR(event_date) = YEAR(CURDATE())`) has the same index-prevention caveat mentioned earlier, but the post has already covered this topic thoroughly so repeating the warning would be redundant.
- All SQL examples are syntactically correct and would produce the described results across MySQL 5.7 and 8.x.
