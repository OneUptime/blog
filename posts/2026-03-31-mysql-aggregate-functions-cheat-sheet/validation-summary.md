# Validation Summary: MySQL Aggregate Functions Cheat Sheet

## Status
validated

## Post Type
Cheat Sheet / Reference

## Technologies Covered
- MySQL (aggregate functions, GROUP BY, HAVING, ROLLUP)

## Sources Consulted
- MySQL 8.0 Reference Manual: Aggregate Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (ROLLUP) — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual: GROUP_CONCAT — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_group-concat
- MySQL 5.7 Reference Manual: Aggregate Functions (to verify availability prior to 8.0) — https://dev.mysql.com/doc/refman/5.7/en/aggregate-functions.html

## Issues Found
1. **Incorrect version label on Statistical Functions section**: The heading "Statistical Functions (MySQL 8.0+)" implied that `STD()`, `STDDEV()`, and `VARIANCE()` are MySQL 8.0+ features. These functions have been available since at least MySQL 3.23/4.x. Removed the "(MySQL 8.0+)" qualifier from the heading.

2. **Misleading summary claim about SUM/AVG on date columns**: The summary stated "SUM, AVG, MIN, and MAX work on numeric and date columns." `SUM` and `AVG` do not meaningfully operate on date columns — they implicitly convert dates to numbers, producing nonsensical results. Corrected to: "SUM and AVG work on numeric columns; MIN and MAX work on numeric, date, and string columns."

## Review Notes
- All SQL syntax is correct and follows MySQL conventions.
- The `GROUP_CONCAT` default max length of 1024 bytes is accurate for the `group_concat_max_len` system variable.
- The `WITH ROLLUP` syntax shown is the MySQL-specific syntax (as opposed to standard SQL `ROLLUP(...)` in the GROUP BY list), which is correct for MySQL.
- The `COUNT(CASE WHEN ... THEN 1 END)` pattern is correct — `COUNT` skips NULLs, so unmatched rows (which return NULL from the CASE) are not counted.
- The summary states "GROUP_CONCAT is unique to MySQL" — while other databases have equivalents (e.g., PostgreSQL's `STRING_AGG`, SQLite's `GROUP_CONCAT`), the MySQL-specific syntax with `ORDER BY` and `SEPARATOR` clauses is indeed unique. This is an acceptable simplification for a MySQL-focused cheat sheet.
