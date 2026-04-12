# Validation Summary: How to Use PERCENT_RANK() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (PERCENT_RANK, NTILE, CUME_DIST, RANK)
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: PERCENT_RANK() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_percent-rank
- MySQL 8.0 Reference Manual: CUME_DIST() — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_cume-dist

## Issues Found
1. **Incorrect column name in NTILE comparison example (line 54):** The query used `name` as a column from `test_scores`, but the only `test_scores` table defined in the post has columns `student_id`, `subject`, and `score` — no `name` column. Changed `name` to `student_id` and added `WHERE subject = 'Math'` for consistency with the table definition.
2. **Incorrect column name in CUME_DIST comparison example (line 120):** Same issue — the query selected `name` from `test_scores WHERE subject = 'Math'`, but the defined table has no `name` column. Changed `name` to `student_id`.

## Review Notes
- The formula `(rank - 1) / (total rows - 1)` is correct per MySQL documentation. The edge case where a partition has only one row (resulting in 0/0) returns 0 in MySQL — the post doesn't mention this but it's a minor edge case that doesn't affect practical usage.
- The CUME_DIST formula comment `rank/N` is a simplification that holds when there are no ties. This is acceptable for a brief inline comment.
- All SQL syntax is valid for MySQL 8.0+. The use of window functions inside CTEs and with GROUP BY is correct.
- The customer value percentile example correctly uses `PERCENT_RANK() OVER (ORDER BY SUM(amount))` in a grouped query, which is valid since window functions are evaluated after GROUP BY.
