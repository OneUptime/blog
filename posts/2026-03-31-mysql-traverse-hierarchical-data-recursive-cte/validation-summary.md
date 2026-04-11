# Validation Summary: How to Traverse Hierarchical Data with Recursive CTEs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Recursive CTEs (`WITH RECURSIVE`)
- SQL (DDL and DML)

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — Server System Variables (`cte_max_recursion_depth`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth
- MySQL 8.0 Reference Manual — Server System Variables (`max_sp_recursion_depth`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_sp_recursion_depth

## Issues Found
1. **Incorrect reference to `max_sp_recursion_depth`**: The "Preventing Infinite Loops" section stated you could set `max_sp_recursion_depth` or rely on `cte_max_recursion_depth` to cap recursion depth. `max_sp_recursion_depth` controls the recursion depth for stored procedures, not for recursive CTEs. Only `cte_max_recursion_depth` is relevant for CTEs. Fixed by removing the `max_sp_recursion_depth` reference and keeping only the correct `cte_max_recursion_depth` variable.

## Review Notes
- All SQL code examples are syntactically correct and would produce the described results against the sample data.
- The cycle detection approach using `FIND_IN_SET` with a comma-separated `visited_ids` string is a valid technique, though it has practical limits for very deep trees since the string column could overflow the CHAR(200) allocation.
- The `CAST(category_name AS CHAR(1000))` in the path column is appropriate to prevent truncation warnings during recursive concatenation.
