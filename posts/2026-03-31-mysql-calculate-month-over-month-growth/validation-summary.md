# Validation Summary: How to Calculate Month-over-Month Growth in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions require 8.0+)
- SQL window functions (LAG)
- Common Table Expressions (CTEs)
- DATE_FORMAT, YEAR, MONTH functions
- NULLIF for division-by-zero protection

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Restrictions: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — LAG(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_lag
- MySQL 8.0 Reference Manual — HAVING clause: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — WITH (CTE): https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found

### 1. HAVING clause used with window function alias (Critical)
**What was wrong:** The "Highlighting Declining Months" section used `HAVING mom_pct < 0` to filter rows based on a window function result. In MySQL, window functions are evaluated after HAVING in the logical query processing order and are only permitted in the SELECT list and ORDER BY clause. This query would produce an error.

**What was changed:** Wrapped the window function computation in a second CTE (`mom_calc`) and replaced `HAVING mom_pct < 0` with `WHERE mom_pct < 0` on the outer query, which correctly filters after the window function has been evaluated.

### 2. Description mentions "self-joins" (Minor)
**What was wrong:** The post description claimed the post covers "self-joins" as a technique, but no self-join example appears anywhere in the post.

**What was changed:** Removed "self-joins" from the description to accurately reflect the post's content.

## Review Notes
- The "MoM for Multiple Metrics" section intro says it calculates MoM for "revenue, order count, and average order value simultaneously," but the query only computes MoM percentages for revenue and order count. The average order value is just rounded, not compared month-over-month. This is not a SQL error but the description slightly overstates what the query does.
- All queries require MySQL 8.0+ due to window function and CTE usage. The post does not mention this version requirement, which could be worth noting for readers on older MySQL versions.
- Using `DATE_FORMAT(order_date, '%Y-%m')` as a string for ordering works correctly for chronological sorting since the format is zero-padded (e.g., '2024-01' < '2024-02').
