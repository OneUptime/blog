# Validation Summary: How to Use TIMESTAMPDIFF() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (TIMESTAMPDIFF, DATEDIFF, DATE_ADD, CURDATE, NOW, IFNULL functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — TIMESTAMPADD unit values (shared with TIMESTAMPDIFF): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampadd

## Issues Found
1. **Missing MICROSECOND unit**: The supported units list omitted `MICROSECOND`. Per the MySQL documentation, the legal unit values for `TIMESTAMPDIFF()` are the same as for `TIMESTAMPADD()`, which includes `MICROSECOND`. Added it to the list.

## Review Notes
- All computed output values in code comments were manually verified and are correct (including the 2024 leap year affecting the DAY calculation).
- The age decomposition pattern (years + months + remaining days) using `DATE_ADD` with `INTERVAL ... MONTH` is a well-known correct approach.
- The DATEDIFF vs TIMESTAMPDIFF comparison correctly notes the argument-order difference (DATEDIFF returns expr1 − expr2, while TIMESTAMPDIFF returns expr2 − expr1) and the truncation behavior.
- All SQL is syntactically valid.
