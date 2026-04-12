# Validation Summary: How to Generate Number Sequences with Recursive CTEs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Recursive Common Table Expressions (CTEs)
- SQL (`WITH RECURSIVE`, `UNION ALL`, `CROSS JOIN`)

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — cte_max_recursion_depth system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth
- MySQL 8.0 Reference Manual — INSERT ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html

## Issues Found

1. **Parameterized Sequence section — code did not match description.** The description said "Wrap the start and end values in a CTE for clarity" but the code was a plain recursive CTE with hardcoded values (identical in structure to the Basic Integer Sequence). Fixed by rewriting the code to use a separate `params` CTE that defines `start_val` and `end_val`, which the recursive `seq` CTE then references. Updated the description to say "Wrap the start and end values in a separate CTE so they are defined once."

2. **Test Data section — inaccurate description.** The description said "Cross-join a sequence with a values list to quickly generate large datasets" but the code does not perform a cross-join — it simply selects generated expressions from a single recursive CTE. Fixed the description to "Use a sequence as a row generator to quickly populate tables with test data."

## Review Notes
- All SQL examples use valid MySQL 8.0+ syntax and would execute correctly.
- The Fibonacci example correctly uses two-column state tracking and the termination condition on column `b`.
- The multiplication table example correctly uses two independent CTEs within a single `WITH RECURSIVE` clause and cross-joins them.
- The default `cte_max_recursion_depth` value of 1000 is accurate for MySQL 8.0.
- The test data INSERT example generates exactly 1000 rows (i from 1 to 1000), which is at the default recursion depth limit — this works because the anchor row does not count as a recursive iteration, resulting in 999 recursive steps.
