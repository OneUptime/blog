# Validation Summary: How to Use COUNT() OVER for Running Counts in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (COUNT() OVER)
- PARTITION BY, ORDER BY, ROWS BETWEEN frame clauses

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0.2 Milestone Release Announcement: https://dev.mysql.com/blog-archive/the-mysql-8-0-2-milestone-release-is-available/

## Issues Found

### 1. Misleading description of running count behavior with tied ORDER BY values
**Section:** Basic Running Count Example
**What was wrong:** The post stated the running count "increments by 1 for every new order in date order." This is incorrect when multiple orders share the same `order_date`. The default window frame with ORDER BY is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, meaning peer rows (rows with identical ORDER BY values) all receive the same count, and the count jumps by the number of peers — not by 1.
**What was changed:** Replaced the description with an explanation of the default RANGE frame behavior and recommended `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` or `ROW_NUMBER()` for strict per-row incrementing.

### 2. Misleading claim about sequential position from partitioned COUNT(*)
**Section:** Partitioned Running Count
**What was wrong:** The post stated the partitioned count "tells you the sequential position of each order within a customer's history — useful for identifying first orders, second orders, and so on." With the default RANGE frame, orders sharing the same date within a customer partition receive the same count, so this is not a true sequential position.
**What was changed:** Clarified that the RANGE default causes tied dates to share the same count, and recommended `ROW_NUMBER()` for a unique sequential position per order.

## Review Notes
- All SQL syntax in the post is correct for MySQL 8.0.
- The ROWS BETWEEN sliding window example, the non-NULL counting example, the total-vs-running comparison, and the duplicate detection pattern are all technically correct.
- The performance tips are reasonable general advice.
- The post could benefit from a brief mention that window functions require MySQL 8.0+ and are not available in MySQL 5.7, but this is not an error — just a potential improvement.
