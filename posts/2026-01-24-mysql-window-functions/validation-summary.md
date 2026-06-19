# Validation Summary: How to Handle Window Functions in MySQL 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- SQL window functions
- Window frames
- Named windows
- Aggregate window functions
- MySQL query analysis with EXPLAIN ANALYZE

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Concepts and Syntax - https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: Window Function Descriptions - https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL Reference Manual: Window Function Frame Specification - https://dev.mysql.com/doc/refman/8.4/en/window-functions-frames.html
- MySQL Reference Manual: Named Windows - https://dev.mysql.com/doc/refman/8.4/en/window-functions-named-windows.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement / EXPLAIN ANALYZE - https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL Reference Manual: Aggregate Function Descriptions - https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html
- MySQL Reference Manual: Window Function Optimization - https://dev.mysql.com/doc/refman/8.4/en/window-function-optimization.html

## Issues Found
- The displayed ranking result used `ROW_NUMBER() OVER (ORDER BY amount DESC)` with duplicate `amount` values, which makes row numbers within ties nondeterministic. I added `id` as a tie-breaker for `ROW_NUMBER()` and the final `ORDER BY`, while leaving `RANK()` and `DENSE_RANK()` ordered by `amount` so the tie behavior remains accurate.
- The "Rank salespeople within each region" example ranked individual sale rows, not aggregated salespeople. I changed the comment to "Rank sales within each region."
- Several row-frame examples ordered only by `sale_date`, but the sample data contains multiple rows on the same date. I added `id` to the window `ORDER BY` clauses and final result ordering where needed so running totals, moving averages, frame examples, and gap analysis have deterministic row order.
- The moving average examples used `ROWS` frames but described and named the results as day-based windows. I changed the labels from day-based to row-based because `ROWS BETWEEN 2 PRECEDING` and `ROWS BETWEEN 6 PRECEDING` count rows, not calendar days.
- The null-handling moving average counted all rows with `COUNT(*)`, even though `AVG(amount)` ignores `NULL` values. I changed it to `COUNT(amount)` and renamed the alias to show the count of non-null values used by the average.

## Review Notes
The article is technically relevant and the SQL examples are appropriate for MySQL 8.0 after the corrections above. `EXPLAIN ANALYZE` is available starting in MySQL 8.0.18, so users on earlier MySQL 8.0 patch releases would need regular `EXPLAIN`.
