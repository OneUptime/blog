# Validation Summary: How to Build MySQL Window Functions Advanced

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- SQL window functions
- Aggregate window functions
- Ranking functions
- Common table expressions
- Indexing and query performance

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions, https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Window Function Concepts and Syntax, https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification, https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual: Window Function Descriptions, https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Named Windows, https://dev.mysql.com/doc/refman/8.0/en/window-functions-named-windows.html
- MySQL 8.0 Reference Manual: Window Function Optimization, https://dev.mysql.com/doc/refman/8.0/en/window-function-optimization.html
- MySQL 8.0 Reference Manual: Optimization and Indexes, https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html

## Issues Found
- The post described MySQL's default ordered window frame as `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. MySQL's documented default with `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, including peers of the current row. Updated the affected explanations and examples.
- The ROWS moving-average example called the result a "3-day" moving average, but `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` means up to three physical rows, not necessarily three calendar days. Updated the wording to "3-row" moving average.
- The RANGE example implied that the query summed only rows on the same date. The query actually calculates a cumulative sum through the current date, with duplicate dates treated as peers. Updated the comments accordingly.
- The named-window example labeled ordered aggregate windows as full regional totals, averages, and counts. Because the named window includes `ORDER BY sale_date`, those aggregates are running values under MySQL's default frame. Renamed the output aliases to running totals, averages, and counts.
- The indexing performance diagram made absolute claims that an index avoids full table scans, eliminates sorting, and enables index-only scans. These are optimizer-dependent. Softened the diagram labels to "can" statements.
- The LAST_VALUE pitfall described the default frame as ending only at the current row. In MySQL's default `RANGE` frame it ends at the current row and its peers. Updated the wording.

## Review Notes
The examples assume MySQL 8.0 or later, which is appropriate because MySQL window functions were introduced in MySQL 8.0. The post's external MySQL documentation link points to the correct official window functions documentation.
