# Validation Summary: How to Use UPDATE with JOIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UPDATE with JOIN syntax)
- SQL (DML statements, INNER JOIN, LEFT JOIN, derived tables, correlated subqueries)

## Sources Consulted
- MySQL 8.0 Reference Manual — UPDATE Statement: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — CASE Expression: https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual — ROUND Function: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round

## Issues Found

1. **Misleading comment on salary_band example (line 104):** The SQL comment said "Assign salary_band based on salary relative to department budget" but the CASE expression only uses absolute salary thresholds (90000, 70000) and never references `d.budget`. Changed the comment to "Assign salary_band based on salary thresholds" to accurately describe what the query does.

2. **Incorrect equivalence claim in JOIN vs Subquery comparison (line 247):** The correlated subquery was described as "equivalent but typically slower" to the JOIN version. This is not strictly correct: the INNER JOIN version only updates rows with a matching department, while the correlated subquery updates ALL rows, setting the column to NULL for employees without a matching department. Changed "equivalent" to "similar" and added a clarifying comment explaining the behavioral difference.

## Review Notes
- All SQL syntax is valid MySQL. The UPDATE...JOIN pattern, table aliases, CASE expressions, ROUND(), and derived table subqueries all use correct MySQL syntax.
- All expected query outputs were manually traced and verified to be correct given the sequential execution of statements.
- The three-table JOIN example does not show expected output, which is fine — the SELECT is provided for the reader to run.
- The salary_band CASE example technically doesn't need the JOIN at all (since it doesn't reference the departments table in the SET clause), but it still works correctly and serves as a demonstration of UPDATE with JOIN syntax. Left as-is since fixing this would require restructuring the example.
