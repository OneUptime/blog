# Validation Summary: How to Calculate Year-Over-Year Growth with Window Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+, required for window functions)
- SQL Window Functions (LAG())
- Common Table Expressions (CTEs)
- NULLIF() for safe division
- MySQL indexing

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — LAG(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag
- MySQL 8.0 Reference Manual — NULLIF(): https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_nullif
- MySQL 8.0 Reference Manual — CREATE INDEX: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Server SQL Modes (ERROR_FOR_DIVISION_BY_ZERO): https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html

## Issues Found
- **Multi-Metric YoY section referenced a non-existent column**: The query used `units_sold` from the `monthly_revenue` table, but the table definition in the "Setting Up Sample Data" section only includes `year_num`, `month_num`, and `revenue`. Running this query against the sample table would produce an "Unknown column" error. **Fix**: Added a note before the query clarifying that the table needs an additional `units_sold` column, with the `ALTER TABLE` statement to add it.

## Review Notes
- The post does not mention that window functions require MySQL 8.0 or later. Readers on MySQL 5.7 or earlier would encounter syntax errors. This is a common assumption in modern MySQL tutorials but could be noted in a future update.
- The NULLIF() section states division by zero would produce "an error." In MySQL 8.0 with default strict SQL mode, division by zero in a SELECT produces a warning and returns NULL, not a hard error. The NULLIF() approach is still best practice as it avoids the warning entirely, so the advice is sound even if the wording is slightly imprecise.
- All SQL syntax (CREATE TABLE, INSERT, SELECT with window functions, CTEs, ALTER TABLE ADD INDEX) is correct for MySQL 8.0+.
- The LAG() partitioning and ordering logic is correctly explained and properly applied throughout all examples.
