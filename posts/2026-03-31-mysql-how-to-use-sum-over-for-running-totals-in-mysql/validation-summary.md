# Validation Summary: How to Use SUM() OVER for Running Totals in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ Window Functions
- SQL SUM() aggregate/window function
- OVER clause with PARTITION BY, ORDER BY, and frame specifications (ROWS vs RANGE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Concepts — https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual: Window Function Descriptions (SUM) — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and executable on MySQL 8.0+.
- The sample output arithmetic was verified and is accurate (1200 → 2000 → 3500).
- The explanation of default frame behavior (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when `ORDER BY` is present) is accurate per MySQL documentation.
- The distinction between `ROWS` and `RANGE` frame types for handling ties is correctly explained.
- The cumulative percentage query correctly uses `SUM(amount) OVER (PARTITION BY region)` without `ORDER BY` to get the full partition total as the denominator.
- The post correctly notes that window functions require MySQL 8.0+.
