# Validation Summary: How to Calculate Modes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for window function examples)
- SQL GROUP BY, HAVING, and aggregate functions
- SQL Common Table Expressions (CTEs)
- RANK() window function with PARTITION BY

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: GROUP BY Modifiers — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: RANK() Function — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_rank
- MySQL 8.0 Reference Manual: Aggregate Functions — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html

## Issues Found
- **Inaccurate text in "Combining Mode and Other Statistics" section**: The introductory sentence claimed the query computes "mode alongside average and median," but the SQL only calculates average and mode — no median is computed. Changed "average and median" to "average" to match the actual query.

## Review Notes
- All six SQL examples are syntactically correct and use valid MySQL 8.0+ features where noted.
- The post correctly states that MySQL lacks a built-in MODE() aggregate function.
- The RANK() window function explanation is accurate — it assigns rank 1 to all tied top values, correctly handling multimodal datasets.
- The use of COUNT(*) inside a window function's ORDER BY clause within a GROUP BY query (Example 6) is valid because window functions are evaluated after GROUP BY in MySQL 8.0+.
- The JOIN in Example 6 will produce multiple rows per department if there are ties for the mode salary; this is expected behavior and not flagged as an error.
- CTEs require MySQL 8.0+; this is correctly noted in the "Using Window Functions" section header but not repeated for later CTE-based examples. This is a minor omission but not a technical error.
