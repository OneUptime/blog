# Validation Summary: How to Calculate Moving Averages in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (window functions)
- MySQL 5.7 (self-join fallback)
- SQL window functions: AVG() OVER, SUM() OVER, ROWS BETWEEN, PARTITION BY

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — DATE_SUB(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-sub

## Issues Found
1. **Incorrect moving average value for Jan 08 in output table**: The 7-Day SMA output showed `1300.00` for `2026-01-08`, but the correct value is `1285.71` ((1200+900+1500+1100+1300+1400+1600)/7 = 9000/7 = 1285.714...). Fixed to `1285.71`.

2. **Missing rows in output table**: The sample output for the 7-Day SMA query only showed 8 rows, but the query returns all 10 rows from the `daily_sales` table. Added the missing rows for `2026-01-09` (1285.71) and `2026-01-10` (1414.29).

3. **Misleading description**: The post description claimed to cover "simple, weighted, and exponential moving averages," but the post only demonstrates simple (trailing), centered, and cumulative moving averages. There are no weighted or exponential moving average examples. Changed description to accurately reflect the content: "simple, centered, and cumulative moving averages."

## Review Notes
- All SQL syntax is correct for MySQL 8.0 window functions.
- The `PARTITION BY` example references a `category_sales` table not defined in the sample dataset. This is acceptable as a conceptual example but readers would need to create their own table to test it.
- The "Comparing Revenue to Moving Average" section uses a subquery join, which works but could be simplified with a CTE or by using the window function directly in the CASE expression. This is a style choice, not an error.
- The MySQL 5.7 self-join workaround is correct and uses `DATE_SUB` with `INTERVAL 6 DAY` to match the 7-day window.
