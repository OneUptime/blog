# Validation Summary: How to Use SELF JOIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general SQL syntax, applicable to MySQL 5.7+ and 8.0+)
- SQL JOINs (INNER JOIN, LEFT JOIN)
- Recursive CTEs (mentioned as best practice for MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Sorting of NULL values in ORDER BY: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual — Recursive CTEs: https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found

### Issue 1: Incorrect output order in "Reporting Hierarchy" example
- **What was wrong:** The displayed query result for the employee/manager hierarchy did not match the `ORDER BY m.name, e.name` clause. In MySQL, NULL values sort before non-NULL values in ascending order, so the correct order is: Sarah (NULL manager), then employees managed by Alice, Bob, and Sarah — alphabetically by manager name, then by employee name within each group. The original output showed a logical tree-traversal order instead.
- **What was changed:** Reordered the output table to correctly reflect `ORDER BY m.name, e.name`: Sarah (NULL), Carol/Dave (Alice), Eve/Frank (Bob), Alice/Bob (Sarah).
- **Why:** Readers running the query would get a different result than shown, causing confusion.

### Issue 2: Incorrect output in "Find Employees Who Earn More Than Their Manager" example
- **What was wrong:** The output showed Alice (salary 105,000) paired with Sarah (salary 150,000) as a result row, but the query filters `WHERE e.salary > m.salary`. Since 105,000 is NOT greater than 150,000, Alice should not appear. The correct result is an empty set. The text after the output ("No results - all managers earn more") was correct but contradicted the shown output table.
- **What was changed:** Replaced the incorrect result table with `Empty set (0.00 sec)` and adjusted the explanatory text to flow naturally ("No employees earn more than their manager with the current data.").
- **Why:** The output contradicted both the query logic and the post's own explanatory text.

## Review Notes
- All SQL syntax is correct and standard MySQL-compatible.
- The CREATE TABLE, INSERT, and UPDATE statements are syntactically correct.
- The self-join concept is explained accurately — MySQL indeed has no SELF JOIN keyword.
- The `a.id < b.id` technique for avoiding duplicate pairs is correctly explained and demonstrated.
- The best practices section gives sound advice, including the recommendation for Recursive CTEs in MySQL 8.0 for deep hierarchies.
- The direct reports count query correctly uses LEFT JOIN to include employees with zero reports.
