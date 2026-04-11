# Validation Summary: How to View Server Variables with SHOW VARIABLES in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- SHOW VARIABLES command
- performance_schema system variable tables
- performance_schema.variables_info

## Sources Consulted
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA GLOBAL_VARIABLES and SESSION_VARIABLES Tables: https://dev.mysql.com/doc/refman/5.7/en/information-schema-variables-table.html
- MySQL 8.0 Reference Manual — Using System Variables (SET statement, suffix multipliers): https://dev.mysql.com/doc/refman/8.0/en/using-system-variables.html
- MySQL 8.0 Reference Manual — Performance Schema variables_info Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html
- MySQL 8.0 Reference Manual — Performance Schema System Variable Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html

## Issues Found

1. **`information_schema.GLOBAL_VARIABLES` does not exist in MySQL 8.0.** The post recommended `information_schema.GLOBAL_VARIABLES` for programmatic access, but this table was deprecated in MySQL 5.7 and removed in MySQL 8.0. Changed to `performance_schema.global_variables` in both the code example (section "Use information_schema for Programmatic Access") and the Summary section.

2. **`SET SESSION sort_buffer_size = 8M` is invalid SQL.** Suffix multipliers (K, M, G) are only supported in config files and on the command line, not in SET statements at runtime. Changed to `SET SESSION sort_buffer_size = 8*1024*1024`.

3. **VARIABLE_SOURCE value `GLOBAL` was misdescribed.** The post said `GLOBAL` means "set with SET GLOBAL". In reality, `GLOBAL` means the variable was read from a global option file (e.g., `/etc/my.cnf`). Corrected the description.

4. **VARIABLE_SOURCE value `CONFIG` does not exist.** The post listed `CONFIG` as meaning "set in my.cnf", but `CONFIG` is not a valid VARIABLE_SOURCE value. Replaced with `DYNAMIC`, which is the correct value for variables set at runtime via `SET GLOBAL` or `SET SESSION`.

## Review Notes
- The section heading "Use information_schema for Programmatic Access" still references information_schema in the heading text, but the actual content now correctly points to performance_schema. The heading was left as-is since it still communicates the concept (programmatic vs interactive access) and changing it would be a stylistic rather than technical fix.
- The VARIABLE_SOURCE list is a subset of all possible values. Additional valid values include SERVER, EXPLICIT, EXTRA, USER, and LOGIN, which cover various option file sources. The subset shown is sufficient for an introductory tutorial.
- Viewing sensitive variable values in performance_schema requires the SENSITIVE_VARIABLES_OBSERVER privilege (added in MySQL 8.0.29), which the post does not mention but could be relevant for readers on newer MySQL versions.
