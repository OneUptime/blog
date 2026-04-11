# Validation Summary: What Is a Recursive CTE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Recursive Common Table Expressions (CTEs)
- SQL (`WITH RECURSIVE`, `UNION ALL`, `DATE_ADD`, `CONCAT`, `REPEAT`)

## Sources Consulted
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: Server System Variables (`cte_max_recursion_depth`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_cte_max_recursion_depth
- MySQL 8.0 Reference Manual: String Functions (`CONCAT`, `REPEAT`) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: SQL Mode (`PIPES_AS_CONCAT`) — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_pipes_as_concat

## Issues Found
1. **`||` used as string concatenation in BOM example (line 115)**: MySQL treats `||` as the logical OR operator by default, not string concatenation (unlike PostgreSQL or standard SQL). The expression `REPEAT('  ', level) || name` would evaluate as a boolean OR, returning 0 or 1, not a concatenated string. Fixed by replacing with `CONCAT(REPEAT('  ', level), name)`. The `||` operator only acts as concatenation if the `PIPES_AS_CONCAT` SQL mode is enabled, which is not the default.

## Review Notes
- The inline `REFERENCES categories(id)` in the `CREATE TABLE categories` statement is parsed but silently ignored by MySQL when specified at the column level. A proper foreign key requires `FOREIGN KEY (parent_id) REFERENCES categories(id)` as a table-level constraint. This doesn't affect the CTE examples, so it was left as-is since the post's focus is on recursive CTEs, not table design.
- The date series example initializes `dt` as a string literal rather than an explicit `DATE` type. MySQL's `DATE_ADD` handles implicit conversion correctly, so this works as intended. Casting with `CAST('2026-01-01' AS DATE)` would be more explicit but is not required.
- The default `cte_max_recursion_depth` of 1000 is correctly stated for MySQL 8.0.
