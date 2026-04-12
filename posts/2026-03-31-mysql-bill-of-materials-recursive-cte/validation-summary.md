# Validation Summary: How to Handle Bill of Materials with Recursive CTEs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (recursive CTEs via `WITH RECURSIVE`)
- SQL (DDL, DML, hierarchical queries)
- Bill of Materials (BOM) data modeling

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — FIND_IN_SET(): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_find-in-set
- MySQL 8.0 Reference Manual — cte_max_recursion_depth: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth

## Issues Found
1. **Cycle Detection snippet used wrong column and wrong format for `FIND_IN_SET`.**
   - **What was wrong:** The original snippet `WHERE FIND_IN_SET(b.child_id, CAST(be.path AS CHAR(1000))) = 0` referenced `be.path`, which contains component *names* separated by ` > ` (e.g., `"Motherboard > CPU"`). `FIND_IN_SET` expects a comma-separated list of values, and `b.child_id` is a numeric ID — so the comparison would never correctly detect a cycle.
   - **What was changed:** Replaced the snippet with instructions to add a separate `id_path` column containing comma-separated component IDs (e.g., `"2,5"`), then use `FIND_IN_SET(b.child_id, be.id_path) = 0` as the guard. This ensures IDs are compared against IDs in a proper comma-delimited format.
   - **Why:** `FIND_IN_SET` requires comma-separated values and the values must be of compatible types. The original used name-based paths with ` > ` separators, making cycle detection non-functional.

## Review Notes
- The `cte_max_recursion_depth` default of 1000 is correct for MySQL 8.0+.
- All other recursive CTE queries (BOM explosion, total cost calculation, where-used search) are syntactically correct and logically sound.
- The total material cost query sums costs across all tree levels; this is correct under the standard BOM convention where each component's `unit_cost` represents its own cost only (not including sub-components).
