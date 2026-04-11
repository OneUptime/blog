# Validation Summary: What Is a System Variable in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL system variables (global and session scope)
- performance_schema
- SET PERSIST / SET PERSIST_ONLY (MySQL 8.0)
- my.cnf configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: SET Syntax for Variable Assignment (https://dev.mysql.com/doc/refman/8.0/en/set-variable.html)
- MySQL 8.0 Reference Manual: Persisted System Variables (https://dev.mysql.com/doc/refman/8.0/en/persisted-system-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema System Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html)
- MySQL 8.0 Reference Manual: performance_schema.variables_info Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-variables-info-table.html)
- MySQL 8.0 Reference Manual: Query Cache Removal (https://dev.mysql.com/doc/refman/8.0/en/query-cache.html)

## Issues Found

1. **"query caching behavior" reference (line 13)**: The overview mentioned "query caching behavior" as an example of what system variables control. The query cache was deprecated in MySQL 5.7.20 and removed entirely in MySQL 8.0. Since this post covers MySQL 8.0 features (SET PERSIST), this reference was misleading. Changed to "query execution behavior."

2. **Incorrect comment "Using information_schema" (line 32)**: The SQL comment said "Using information_schema" but the actual query referenced `performance_schema.global_variables`. In MySQL 8.0, the system variable tables in `information_schema` are deprecated in favor of `performance_schema`. The query itself was correct; only the comment was wrong. Fixed the comment to say "Using performance_schema."

3. **Misleading comment "Find dynamic variables" (line 102)**: The SQL comment said "Find dynamic variables in performance_schema" but the query (`WHERE variable_source != 'COMPILED'`) finds variables whose values differ from the compiled defaults — not variables that are dynamic (changeable at runtime). The `variable_source` column indicates where the current value was set from (e.g., COMMAND_LINE, PERSISTED, GLOBAL, EXPLICIT), not whether the variable is dynamic. Fixed the comment to accurately describe what the query does: "Find variables that have been changed from their compiled defaults."

## Review Notes
- The claim that `innodb_buffer_pool_size` was non-dynamic "in older versions" is correct — it became dynamically configurable in MySQL 5.7.5. The broader statement that "many became dynamic in MySQL 8.0" is also accurate.
- The `@@variable_name` shorthand behavior (session scope first, global fallback) is correctly described.
- All SQL syntax for SET GLOBAL, SET SESSION, SET PERSIST, SET PERSIST_ONLY, and RESET PERSIST is correct per MySQL 8.0 documentation.
- The my.cnf configuration format and the note about underscores/hyphens being interchangeable is correct.
