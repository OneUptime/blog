# Validation Summary: What Is the MySQL Audit Plugin

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL Enterprise Audit (audit_log plugin)
- MySQL 8.0 audit log filtering (rule-based UDFs)
- MySQL option file configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Enterprise Audit — https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual: Audit Log Reference (system variables and formats) — https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual: Audit Log Filtering — https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html
- MySQL 8.0 Reference Manual: Option File Syntax — https://dev.mysql.com/doc/refman/8.0/en/option-files.html

## Issues Found

1. **Invalid `CSV` format listed in Audit Log Formats table.** MySQL Enterprise Audit supports only three formats: `OLD` (legacy XML), `NEW` (updated XML), and `JSON`. There is no `CSV` format option. Removed the `CSV` row from the table.

2. **Invalid event class `table_ddl_access` in filter example.** The valid audit log event classes are `connection`, `general`, and `table_access`. There is no `table_ddl_access` class. DDL statements (CREATE, ALTER, DROP, etc.) are logged under the `general` class. Changed the filter example to use `"general"` and updated the comment to clarify.

3. **Wrong comment syntax in MySQL option file snippet.** The `audit_log_rotate_on_size` configuration example used `--` as a comment prefix. MySQL option files (`my.cnf`/`my.ini`) use `#` or `;` for comments, not `--` (which is SQL comment syntax). Changed `--` to `#`.

## Review Notes
- The `audit_log_policy` variable and its `SET GLOBAL` usage are correct but represent legacy-mode filtering. MySQL 8.0 recommends rule-based filtering via `audit_log_filter_set_filter()` and `audit_log_filter_set_user()` UDFs instead. The post already covers the rule-based approach, so this is acceptable.
- The `audit_log_rotate()` function was introduced in MySQL 8.0.31. Earlier versions use `SET GLOBAL audit_log_flush = ON` to trigger rotation. The post does not mention version requirements for this function.
- The sample JSON audit log entry uses `"event": "log"` — the actual MySQL audit log typically uses `"event": "status"` for general-class query events. Since this is illustrative sample data, it was left as-is.
