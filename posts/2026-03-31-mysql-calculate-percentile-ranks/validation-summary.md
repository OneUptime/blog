# Validation Summary: How to Calculate Percentile Ranks in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Window functions: PERCENT_RANK(), NTILE(), CUME_DIST()
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — PERCENT_RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- MySQL 8.0 Reference Manual — NTILE(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_ntile
- MySQL 8.0 Reference Manual — CUME_DIST(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_cume-dist
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html

## Issues Found
No technical issues found.

## Review Notes
- CUME_DIST() is mentioned in the introduction and summary as one of the three key functions but is never demonstrated with a code example. A future update could add a short CUME_DIST() example for completeness.
- The "Finding the Nth Percentile Value" technique using MAX(CASE WHEN pct_rank <= threshold ...) is a common approximation. For exact percentile interpolation (as in statistical software), a more involved calculation would be needed, but the approach shown is standard for SQL-based analytics.
- All window function syntax is valid for MySQL 8.0+. These functions are not available in MySQL 5.7 or earlier, which the post correctly scopes by referencing "MySQL 8.0".
