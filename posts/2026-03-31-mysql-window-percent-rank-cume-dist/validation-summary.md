# Validation Summary: How to Use PERCENT_RANK() and CUME_DIST() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (PERCENT_RANK, CUME_DIST, RANK)
- SQL (DDL, DML, subqueries, named windows)

## Sources Consulted
- MySQL 8.0 Reference Manual — PERCENT_RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- MySQL 8.0 Reference Manual — CUME_DIST(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_cume-dist
- MySQL 8.0 Reference Manual — RANK(): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_rank
- MySQL 8.0 Reference Manual — Window Function Concepts: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- SQL:2011 Standard (window function definitions for CUME_DIST and PERCENT_RANK)

## Issues Found

1. **Bob/Dave name swap in PERCENT_RANK output table (line 83-84)**: The output showed Dave with revenue 95000 and Bob with 80000, but the INSERT data defines Bob=95000 and Dave=80000. Fixed by swapping the names to match the inserted data.

2. **Incorrect name in PERCENT_RANK narrative (line 94)**: The text said "Bob is the last in the East partition" but Dave (80000) is the lowest revenue and thus last in DESC order. Changed "Bob" to "Dave."

3. **Bob/Dave name swap in CUME_DIST output table (line 117-118)**: Same swap as issue 1. Dave was shown at 95000 and Bob at 80000. Fixed to match the INSERT data.

4. **Incorrect CUME_DIST interpretation (line 125)**: The narrative said "50% of East reps have revenue at or below 120000." With ORDER BY revenue DESC, a CUME_DIST of 0.50 means 50% of rows are preceding or peer in the DESC sort order — i.e., 50% have revenue **at or above** 120000. Changed "at or below" to "at or above."

## Review Notes
- All SQL syntax is valid MySQL 8.0 (CREATE TABLE, INSERT, SELECT with window functions, WINDOW clause, subquery filtering).
- The PERCENT_RANK and CUME_DIST formulas are correctly stated.
- The named window clause (`WINDOW w AS (...)`) syntax is correctly used and is valid in MySQL 8.0.
- The best practices section correctly notes that window functions cannot appear in WHERE clauses and must be wrapped in a subquery or CTE.
- The claim that without ORDER BY, PERCENT_RANK returns 0 and CUME_DIST returns 1 for all rows is correct (all rows are peers).
- The West partition outputs were verified and are correct in all examples.
- The filtering example output is correct after accounting for the name fixes (Bob and Dave are excluded by the WHERE clause so they don't appear in filtered results).
