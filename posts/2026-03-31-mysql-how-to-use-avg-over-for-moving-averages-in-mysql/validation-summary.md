# Validation Summary: How to Use AVG() OVER for Moving Averages in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions)
- SQL (AVG(), ROUND(), ROW_NUMBER(), PARTITION BY, ORDER BY, ROWS BETWEEN)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Descriptions (AVG() OVER): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
No technical issues found.

## Review Notes
- All computed output values in the 3-Day Moving Average example were manually verified and are correct.
- The explanation that MySQL uses however many rows are available when the window frame extends before the partition start is accurate behavior per the MySQL documentation.
- The `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` for a 7-day moving average and `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` for a 3-day moving average correctly use N-1 PRECEDING for an N-row window.
- The ROW_NUMBER() approach for enforcing a minimum row count before displaying averages is a sound and commonly used technique.
- All SQL is syntactically valid for MySQL 8.0+.
