# Validation Summary: How to Generate Row Numbers Without Window Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.6 / 5.7 (legacy versions without window function support)
- MySQL user-defined variables (`@var := value` syntax)
- Correlated subqueries for ranking
- MySQL 8.0 `ROW_NUMBER() OVER()` (mentioned for modern alternative)

## Sources Consulted
- MySQL 5.7 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/5.7/en/user-variables.html
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 5.7 Reference Manual — SELECT Statement / ORDER BY: https://dev.mysql.com/doc/refman/5.7/en/select.html
- MySQL 5.7 Reference Manual — Subqueries: https://dev.mysql.com/doc/refman/5.7/en/subqueries.html

## Issues Found
- **Method 3 section title said "Subquery Join" but the technique uses a correlated subquery, not a join.** Changed the heading from "Method 3 - Using a Subquery Join" to "Method 3 - Using a Correlated Subquery" to accurately describe the technique. The body text already correctly called it a "correlated subquery."

## Review Notes
- **Undefined evaluation order caveat**: The MySQL 5.7 documentation explicitly warns that the order of evaluation of expressions involving user variables is undefined outside of SET statements. The user-variable techniques in Methods 1, 2, and 4 rely on left-to-right evaluation in SELECT and on ORDER BY influencing scan order, neither of which is guaranteed. This is a well-known caveat of this legacy pattern. The post could benefit from a brief warning, but since the LEGACY tag is present and this is the de facto standard technique taught across the MySQL community, it is not treated as an error.
- **Result table decimal formatting**: The sample output in Method 1 shows salary values as integers (e.g., `90000`) but the column is defined as `DECIMAL(10,2)`, which would display as `90000.00` in MySQL. This is a minor cosmetic simplification in illustrative output that does not affect the correctness of the technique.
- **Method 3 produces RANK()-like behavior with ties**: The correlated subquery using `COUNT(*)` with `>=` will assign the same number to rows with identical salary values within a department, behaving like `RANK()` rather than `ROW_NUMBER()`. The column is appropriately named `rank_in_dept`, and the sample data has no ties, so this is not incorrect but is worth noting for readers applying this to data with duplicates.
