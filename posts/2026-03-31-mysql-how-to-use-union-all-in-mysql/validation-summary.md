# Validation Summary: How to Use UNION ALL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UNION ALL, UNION, CTEs, Recursive CTEs)
- SQL (set operations, SELECT statements)

## Sources Consulted
- MySQL 8.0 Reference Manual — UNION Clause: https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0.19 Release Notes (added UNION DISTINCT support in recursive CTEs): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html

## Issues Found
1. **Incorrect comment: "Monthly" instead of "Quarterly"** (line 43). The SQL comment said "Monthly sales reports" but the example uses quarterly data (Q1-Q4) with tables named `sales_q1_2025` through `sales_q4_2025`. Changed "Monthly" to "Quarterly."

2. **Inaccurate claim that UNION ALL is "required" in recursive CTEs** (line 96). Since MySQL 8.0.19, `UNION DISTINCT` is also supported in recursive CTEs. Updated the text to say UNION ALL is the "standard operator" and noted that MySQL 8.0.19+ also supports UNION DISTINCT.

## Review Notes
- All SQL syntax is correct and follows MySQL conventions.
- The UNION vs UNION ALL behavioral comparison (4 rows vs 6 rows) is accurate.
- ORDER BY and LIMIT are correctly placed at the end of the UNION ALL chain, applying to the combined result set.
- CTEs require MySQL 8.0+; the post does not mention this version requirement. This is a minor omission but consistent with the blog's general style of not specifying version prerequisites.
- The REPEAT() function usage in the recursive CTE example is valid MySQL syntax.
