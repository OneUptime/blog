# Validation Summary: How to Use ABS() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (Math Functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_abs
- MySQL 8.0 Reference Manual — MOD() function: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_mod
- MySQL 8.0 Reference Manual — DATEDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff
- MySQL 8.0 Reference Manual — COALESCE(): https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_coalesce

## Issues Found
1. **Incorrect result for `ABS(MOD(-17, 5))`**: The post stated the result was `3`, but the correct result is `2`. In MySQL, `MOD(-17, 5)` returns `-2` (since `-17 = (-3) * 5 + (-2)`), and `ABS(-2)` is `2`. Fixed the comment from `-- Result: 3` to `-- Result: 2`.

## Review Notes
- The HAVING clause uses a column alias (`max_deviation`), which is valid in MySQL as a MySQL extension to standard SQL, but would not work in most other SQL databases. This is acceptable since the post is MySQL-specific.
- All other code examples, SQL syntax, NULL handling behavior, and technical explanations are accurate.
