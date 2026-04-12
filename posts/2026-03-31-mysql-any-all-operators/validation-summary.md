# Validation Summary: How to Use ANY and ALL Operators in MySQL Subqueries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (ANY and ALL subquery comparison operators)
- SQL (subqueries, comparison operators, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Subqueries with ANY, IN, or SOME: https://dev.mysql.com/doc/refman/8.0/en/any-in-some-subqueries.html
- MySQL 8.0 Reference Manual — Subqueries with ALL: https://dev.mysql.com/doc/refman/8.0/en/all-subqueries.html
- MySQL 8.0 Reference Manual — Comparison Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html

## Issues Found
1. **Incorrect expected output in "ALL: Find Employees Whose Every Sale Exceeds a Threshold" example.** The query `WHERE 6000 < ALL (SELECT s.amount FROM sales s WHERE s.employee_id = e.id)` requires all of an employee's sales to be above 6000. Carol's sales are 7200, 8100, and 6900 — all above 6000 — so she should appear in the result. The original output was missing Carol. Fixed by adding Carol (Marketing) to the expected result set.

## Review Notes
- The "ANY with Aggregate" example does not include an expected output table. This is not an error, but adding the expected result would improve completeness. The result would include all sales except Eve's 4800 and 4600 entries (which are below the minimum per-employee average of ~4833.33).
- The explanation for the `!= ALL` example uses slightly confusing wording ("Engineering and Marketing employees are excluded from the NOT IN list") but is technically parseable as correct.
- The NULL behavior caveat in Best Practices is accurate and important — `NOT IN` / `!= ALL` with NULLs in the subquery can cause the entire condition to return no rows.
