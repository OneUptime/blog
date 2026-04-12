# Validation Summary: How to Calculate Running Totals with Window Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ window functions
- SUM() OVER() aggregate window function
- PARTITION BY and ORDER BY clauses
- ROWS and RANGE frame clauses
- MySQL views with window functions

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — CREATE VIEW: https://dev.mysql.com/doc/refman/8.0/en/create-view.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly identifies that the default frame clause when ORDER BY is present is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, and advises using explicit `ROWS` for deterministic row-by-row accumulation. This is an important nuance that many tutorials miss.
- All six SQL examples are syntactically correct and use proper MySQL 8.0 window function syntax.
- The percentage-of-total example correctly uses an empty `OVER()` clause (no ORDER BY, no PARTITION BY) to compute the grand total across all rows.
- The claim that running totals are "computed in a single table scan" is a reasonable simplification — MySQL processes window functions over the sorted result set in a single pass, which is more efficient than self-join alternatives, though the sort itself has its own cost.
