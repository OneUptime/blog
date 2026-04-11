# Validation Summary: How to Use JSON_ARRAYAGG() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7.22+ (JSON_ARRAYAGG introduction)
- MySQL 8.0+ (window function support via OVER clause)
- MySQL JSON functions (JSON_ARRAYAGG, JSON_OBJECT)
- SQL aggregate functions

## Sources Consulted
- [MySQL 8.0 Reference Manual — Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html)
- [MySQL 8.4 Reference Manual — Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [MySQL Worklog WL#7987 — JSON aggregation functions](https://dev.mysql.com/worklog/task/?id=7987)
- [MySQL Worklog WL#11574 — Add JSON_ARRAYAGG and JSON_OBJECTAGG windowing functions](https://dev.mysql.com/worklog/task/?id=11574)
- [MySQL Blog — JSON specific window functions in MySQL 8.0](https://dev.mysql.com/blog-archive/json-specific-window-functions-in-mysql-8-0/)

## Issues Found

### 1. Incorrect syntax definition for JSON_ARRAYAGG()
- **What was wrong:** The syntax was shown as `JSON_ARRAYAGG(expr [ORDER BY ...])`, implying ORDER BY is a supported inline clause.
- **What was changed:** Corrected to `JSON_ARRAYAGG(col_or_expr) [over_clause]` matching the official MySQL documentation, and added a note explaining the over_clause and the lack of inline ORDER BY support.
- **Why:** The official MySQL documentation (both 8.0 and 8.4) defines the syntax as `JSON_ARRAYAGG(col_or_expr) [over_clause]`. There is no ORDER BY clause inside the function. The documentation explicitly states: "The order of elements in this array is undefined."

### 2. Incorrect claim that MySQL 8.0 supports ORDER BY inside JSON_ARRAYAGG()
- **What was wrong:** The section "Using ORDER BY Inside JSON_ARRAYAGG()" claimed MySQL 8.0 supports `JSON_ARRAYAGG(tag ORDER BY tag ASC)` syntax. This would produce a syntax error in MySQL.
- **What was changed:** Rewrote the section as "Controlling Element Order" explaining that ORDER BY is not supported inside the function (unlike GROUP_CONCAT), and showed the correct subquery-based workaround with a note about its practical-but-not-guaranteed behavior.
- **Why:** `ORDER BY` inside the aggregate is a feature of `GROUP_CONCAT()`, not `JSON_ARRAYAGG()`. This is a common point of confusion. MariaDB does support this syntax, but MySQL does not.

### 3. Incorrect ORDER BY inside JSON_ARRAYAGG() in the JSON_OBJECT example
- **What was wrong:** The "Aggregating Objects with JSON_OBJECT()" example used `JSON_ARRAYAGG(JSON_OBJECT(...) ORDER BY name)` which is invalid MySQL syntax.
- **What was changed:** Restructured the query to use a subquery with ORDER BY, wrapping the JSON_ARRAYAGG around the pre-sorted results.
- **Why:** Same root cause as issue #2 — ORDER BY is not a valid clause inside JSON_ARRAYAGG() in MySQL.

## Review Notes
- The NULL handling section is accurate — JSON_ARRAYAGG() does include NULL values as JSON null in the resulting array, which is correctly noted.
- The performance considerations are reasonable, though it could be noted that GROUP_CONCAT has a default length limit (group_concat_max_len) while JSON_ARRAYAGG does not have the same limitation.
- The subquery ORDER BY workaround shown in the fix works in practice with MySQL's optimizer but is not formally guaranteed by the SQL standard. The post now includes a disclaimer about this.
