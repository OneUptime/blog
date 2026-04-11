# Validation Summary: How to Use Running Totals with SUM() OVER() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (SUM, COUNT, AVG with OVER clause)
- PARTITION BY and frame specifications (ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct for MySQL 8.0.
- All sample output values were manually verified against the INSERT data and are arithmetically correct (running totals, partition totals, and cumulative percentages).
- The post correctly notes that the default frame with ORDER BY is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, and wisely recommends using `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explicitly for deterministic row-by-row behavior. The distinction between RANGE (which groups ties) and ROWS (which does not) could be called out more explicitly, but this is a depth-of-coverage choice rather than a technical error.
- The PARTITION BY example omits `id` from ORDER BY, which is fine since each (product_category, sale_date) combination is unique in the sample data. The best practices section already covers adding a unique tiebreaker column.
- The best practice about window functions not being usable in WHERE is correct and a common pitfall worth highlighting.
