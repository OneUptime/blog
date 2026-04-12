# Validation Summary: How to Use ROW_NUMBER() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — SELECT Statement (HAVING clause): https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
1. **HAVING used to filter on a window function alias (Identifying Duplicate Rows section):** The original query used `HAVING rn > 1` directly on the result of a `ROW_NUMBER()` call without a subquery. In MySQL's logical query processing order, window functions are evaluated after the `HAVING` clause, so referencing a window function alias in `HAVING` is invalid and would produce an error. Fixed by wrapping the query in a subquery and using `WHERE rn > 1` on the outer query, which is the correct and consistent pattern used throughout the rest of the post. Also corrected the misleading comment "keep id=1" to "keep the earliest" since the query keeps the row with the earliest `created_at`, not necessarily `id=1`.

## Review Notes
- All other code examples are syntactically correct and follow standard MySQL 8.0 patterns.
- The comparison of ROW_NUMBER() vs RANK() vs DENSE_RANK() is accurate with correct example output values.
- The note about LIMIT/OFFSET being simpler for basic pagination is a helpful practical caveat.
- The post correctly states ROW_NUMBER() was introduced in MySQL 8.0 (released April 2018).
