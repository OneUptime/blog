# Validation Summary: How to Calculate Medians in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.x and 8.0+)
- SQL window functions (ROW_NUMBER, COUNT, NTILE)
- Common Table Expressions (CTEs)
- Prepared statements

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: Restrictions on Subqueries — https://dev.mysql.com/doc/mysql-reslimits-excerpt/8.0/en/subquery-restrictions.html
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL Bug #93234: Support percentile_cont (confirming MySQL lacks PERCENTILE_CONT) — https://bugs.mysql.com/bug.php?id=93234

## Issues Found

### Issue 1: Classic Method used subqueries in LIMIT/OFFSET (invalid MySQL syntax)
- **What was wrong:** The original query used subqueries directly inside `LIMIT` and `OFFSET` clauses (`LIMIT 2 - (SELECT COUNT(*) FROM employees) MOD 2` and `OFFSET (SELECT (COUNT(*) - 1) / 2 FROM employees)`). MySQL requires LIMIT and OFFSET values to be nonnegative integer constants, prepared statement parameters, or stored program variables — subqueries and arbitrary expressions are not allowed and would cause a syntax error.
- **What was changed:** Replaced the single-query approach with a prepared statement approach that pre-computes `@lim` and `@off` as user variables, then passes them as parameters via `PREPARE`/`EXECUTE`/`DEALLOCATE`. The median logic (LIMIT evaluates to 1 for odd, 2 for even; OFFSET skips to midpoint) is preserved.
- **Why:** This is the standard MySQL workaround for parameterized LIMIT/OFFSET and is documented in the MySQL reference manual.

### Issue 2: NTILE(4) quartile=2 does not approximate the median
- **What was wrong:** The original query used `NTILE(4)` and filtered `WHERE quartile = 2`, then averaged all values in that bucket. Quartile 2 contains values from approximately the 25th to 50th percentile. Averaging this entire range produces a value systematically lower than the actual median, making it a poor approximation. The text also referenced `PERCENTILE_CONT`, which does not exist in MySQL.
- **What was changed:** Replaced with `NTILE(2)`, which splits data into two halves and averages the boundary values (`MAX` of the lower half and `MIN` of the upper half). Removed the incorrect `PERCENTILE_CONT` reference. Updated the explanation to note that this is exact for even counts and a close approximation for odd counts.
- **Why:** NTILE(2) boundary averaging correctly targets the 50th percentile rather than averaging the entire second quartile. MySQL does not have PERCENTILE_CONT (confirmed via MySQL bug tracker #93234).

## Review Notes
- The user variable method (MySQL 5.x section) relies on `@rownum := @rownum + 1` inside a derived table with ORDER BY. MySQL's documentation states that the order of evaluation for user variable assignments in SELECT is undefined. This pattern works in practice on MySQL 5.x but is technically unreliable and deprecated in MySQL 8.0. The post correctly positions this as a legacy approach, so no change was made.
- The grouped median query is correct — each row carries its own department's `dept_count`, so the `WHERE rn IN (...)` filter correctly identifies median rows per department.
- All window function examples (ROW_NUMBER, COUNT OVER, NTILE, PARTITION BY) use valid MySQL 8.0+ syntax.
