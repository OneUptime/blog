# Validation Summary: How to Use MONTH() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL MONTH() function
- MySQL YEAR(), MONTHNAME(), DATE_FORMAT(), CURDATE(), NOW(), COALESCE() functions
- SQL GROUP BY, ORDER BY, WHERE clauses
- MySQL date and time types (DATE, DATETIME, TIMESTAMP)

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_month
- MySQL 8.0 Reference Manual: MONTHNAME() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_monthname
- MySQL 8.0 Reference Manual: DATE_FORMAT() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual: SQL Mode ONLY_FULL_GROUP_BY — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found
1. **DATE_FORMAT GROUP BY mismatch**: The "Getting the Month Name" section's `DATE_FORMAT()` example used `DATE_FORMAT(order_date, '%M %Y')` in the SELECT but `DATE_FORMAT(order_date, '%Y-%m')` in the GROUP BY. These are different expressions, so with MySQL's default `ONLY_FULL_GROUP_BY` SQL mode (enabled by default since MySQL 5.7.5), this query would fail with error 1055. Fixed by changing the GROUP BY to use the same expression as the SELECT (`DATE_FORMAT(order_date, '%M %Y')`) and changing the ORDER BY to `MIN(order_date)` to preserve chronological ordering.

## Review Notes
- The post correctly advises using range conditions instead of MONTH()/YEAR() on indexed columns for performance, which is an important best practice.
- All other SQL examples are syntactically correct and use valid MySQL functions and syntax.
- The use of column aliases in GROUP BY (e.g., `GROUP BY yr, mo` and `GROUP BY month_num, month_name`) is valid in MySQL, though it is a MySQL-specific extension not part of standard SQL.
- The note about MONTH() returning 0 for zero-date values like '0000-00-00' is accurate per MySQL documentation.
