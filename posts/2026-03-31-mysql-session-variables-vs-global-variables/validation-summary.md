# Validation Summary: How to Use Session Variables vs Global Variables in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- MySQL system variables (global and session scope)
- SET GLOBAL, SET SESSION, SET PERSIST, SET PERSIST_ONLY statements
- SHOW VARIABLES command

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Dynamic System Variables: https://dev.mysql.com/doc/refman/8.0/en/dynamic-system-variables.html
- MySQL 8.0 Reference Manual — SET Syntax for Variable Assignment: https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual — Server Option/Variable Reference: https://dev.mysql.com/doc/refman/8.0/en/server-option-variable-reference.html

## Issues Found

1. **"Variables That Are Session-Only" section listed variables with both scopes.**
   - **What was wrong:** The section claimed `time_zone`, `autocommit`, and `foreign_key_checks` are session-only variables. All three actually have both global and session scope — they can be set with `SET GLOBAL` as well.
   - **What was changed:** Renamed the section to "Variables Commonly Set at Session Scope" and updated the description to say they have both scopes but are most often adjusted per-session. The code examples remain valid since `SET SESSION` on these variables is correct.
   - **Why:** Claiming these are session-only is factually incorrect per MySQL documentation. Readers could be misled into thinking `SET GLOBAL autocommit = 0` is invalid.

2. **`bind_address` listed as a global-only dynamic variable.**
   - **What was wrong:** The "Variables That Are Global-Only" section listed `bind_address` alongside `innodb_buffer_pool_size` and `max_connections` as global-only variables. While `bind_address` does have global scope, it is **not dynamic** — it can only be set at server startup and cannot be changed at runtime with `SET GLOBAL`.
   - **What was changed:** Replaced `bind_address` with `table_open_cache`, which is a genuinely global-only dynamic variable.
   - **Why:** The section's context is about variables you set with `SET GLOBAL` or `SET SESSION`. Including a non-dynamic variable in this list is misleading.

## Review Notes
- The `@@var_name` shorthand description ("returns session value if set, otherwise global") is a slight simplification. More precisely, MySQL returns the session value for variables that have session scope and the global value for global-only variables. The session value exists even if the user hasn't explicitly set it (it's inherited from global at connection time). This simplification is acceptable for a tutorial.
- The post correctly notes that `SET PERSIST` and `SET PERSIST_ONLY` are MySQL 8.0+ features. All other syntax is compatible with MySQL 5.7 and 8.0+.
- All SQL syntax in the post is correct and would execute as described.
