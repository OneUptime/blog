# Validation Summary: How to Find Gaps in Sequential Data in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- SQL self-joins
- LAG window function (MySQL 8.0+)
- Recursive CTEs (MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Recursive CTEs: https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — `cte_max_recursion_depth` system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth
- MySQL 8.0 Reference Manual — SELECT HAVING clause (alias usage): https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
- **Incorrect variable name in inline text (line 137)**: The text referenced `max_recursive_cte` but the correct MySQL system variable name is `cte_max_recursion_depth`. The SQL code on the next line already used the correct name. Fixed the inline text to match.

## Review Notes
- Method 1 (self-join) uses a column alias (`gap_start`) in the HAVING clause. This is a MySQL-specific extension to standard SQL and works correctly in MySQL, but would not be portable to other RDBMSes. Acceptable since the post is MySQL-specific.
- Method 2 (LAG) uses a default value of 0 for LAG. If the first ID in the table is greater than 1, this will report a gap from 1 to (first_id - 1), which may or may not be desired depending on the use case. With the sample data starting at id=1, this works correctly as shown.
- All six SQL examples were traced through with the provided sample data and produce correct results.
- The recursive CTE examples correctly note the MySQL 8.0+ requirement.
