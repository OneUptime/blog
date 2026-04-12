# Validation Summary: How to Calculate Time Between Events in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions require 8.0+)
- LAG() window function
- LEAD() window function
- TIMESTAMPDIFF() function
- DATEDIFF() function
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — LAG(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag
- MySQL 8.0 Reference Manual — LEAD(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lead
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — DATEDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff

## Issues Found
No technical issues found.

## Review Notes
- All six SQL examples are syntactically correct and use proper argument ordering for MySQL functions.
- Window functions (LAG, LEAD, CTEs) require MySQL 8.0 or later. The post does not explicitly state this version requirement. Since MySQL 5.7 reached end of life in October 2023 and 8.0 has been GA since April 2018, this is a minor omission rather than an error.
- The funnel step timing query uses MAX() to pick the latest occurrence of each event type per user. This is a reasonable design choice but worth noting: if a user has multiple page_view events, only the latest is used as the funnel start time.
- TIMESTAMPDIFF argument order (unit, start_datetime, end_datetime) is correct in every usage — earlier timestamp as the second argument, later timestamp as the third.
- DATEDIFF(expr1, expr2) returns expr1 minus expr2 in days, and is used correctly throughout.
