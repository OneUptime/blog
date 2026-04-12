# Validation Summary: How to Use LEAD() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL Window Functions (LEAD)
- TIMESTAMPDIFF function
- PARTITION BY / ORDER BY clauses

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Functions Restrictions: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — SELECT Statement (HAVING clause): https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
1. **Incorrect use of HAVING with window function alias in "Detecting Value Changes" section.**
   - **What was wrong:** The query used `HAVING next_status IS NOT NULL AND next_status <> status` directly on the SELECT that contained the LEAD() window function. In MySQL, window functions are only permitted in the SELECT list and ORDER BY clause. You cannot reference window function results in a HAVING clause. The correct approach is to wrap the window function query in a subquery and filter with WHERE in the outer query.
   - **What was changed:** Replaced the flat query with a subquery pattern: the inner SELECT computes the LEAD() alias, and the outer SELECT filters with WHERE. This is consistent with the "Wrapping LEAD() in a Subquery" section later in the same post.
   - **Why:** Without this fix, the query would produce an error in MySQL 8.0 because window function aliases cannot be resolved in the HAVING clause.

## Review Notes
- The "Looking Multiple Rows Ahead" example uses `LEAD(revenue, 7)` on the `daily_sales` table which only has 5 rows, so every row would return NULL. The example is syntactically correct and illustrates the offset parameter, but readers should note that the offset refers to rows ahead, not calendar days — if the data has gaps, 7 rows ahead may not equal 7 days.
- All other code examples (CREATE TABLE, INSERT, SELECT with LEAD, PARTITION BY, TIMESTAMPDIFF, default value, subquery wrapping) are syntactically correct and produce the expected results.
- The claim that LEAD() was introduced in MySQL 8.0 is accurate.
