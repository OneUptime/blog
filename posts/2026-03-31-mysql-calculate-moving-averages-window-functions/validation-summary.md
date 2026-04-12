# Validation Summary: How to Calculate Moving Averages with Window Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Window Functions (AVG() OVER())
- Recursive CTEs (WITH RECURSIVE)
- SQL Views

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Concepts — https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual: Recursive Common Table Expressions — https://dev.mysql.com/doc/refman/8.0/en/with.html#common-table-expressions-recursive
- MySQL 8.0 Reference Manual: CREATE VIEW — https://dev.mysql.com/doc/refman/8.0/en/create-view.html

## Issues Found
- **Description claimed "weighted" moving averages**: The post description stated it covers "simple, weighted, and exponential moving averages" but no weighted moving average section exists in the post. The post covers simple, centered, and exponential moving averages. Fixed by changing "weighted" to "centered" in the description.

## Review Notes
- The EMA recursive CTE joins on `DATE_ADD(e.order_date, INTERVAL 1 DAY)`, which assumes consecutive dates with no gaps. If the underlying data has gaps (e.g., weekends, holidays), the recursion would stop at the first gap. This is acceptable for the "daily_revenues" use case described but is worth noting for readers adapting the query to datasets with date gaps. A ROW_NUMBER()-based join would be more robust in those scenarios.
- MySQL's `cte_max_recursion_depth` defaults to 1000, which limits the EMA calculation to ~1000 rows. For larger datasets, users would need `SET cte_max_recursion_depth = <higher value>`. This is not mentioned in the post but is a practical consideration.
- All SQL syntax is correct for MySQL 8.0+. Window functions in views are supported. Frame clause arithmetic (6 PRECEDING for 7-day, 29 for 30-day, 89 for 90-day) is correct throughout.
