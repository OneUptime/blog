# Validation Summary: How to Configure Audit Logging in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Enterprise Audit plugin (`audit_log`)
- Audit log filtering (JSON-based rules)
- Percona Audit Log Plugin / MariaDB Audit Plugin (mentioned as alternatives)

## Sources Consulted
- MySQL 8.0 Reference Manual — MySQL Enterprise Audit: https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual — Audit Log File Formats: https://dev.mysql.com/doc/refman/8.0/en/audit-log-file-formats.html
- MySQL 8.0 Reference Manual — Audit Log Filtering: https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html
- MySQL 8.0 Reference Manual — Audit Log Options and Variables: https://dev.mysql.com/doc/refman/8.0/en/audit-log-options-variables.html
- MySQL 8.0 Reference Manual — Audit Log Reference: https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html

## Issues Found

1. **`audit_log` plugin incorrectly described as available in Community Edition**: The post stated "The community can also use the `audit_log` plugin available in MySQL 8.0+" and the install section was titled "For MySQL 8.0 Community Edition." The `audit_log.so` plugin ships only with MySQL Enterprise Edition. Fixed by clarifying Enterprise Edition requirement and correcting the section header.

2. **`audit_log_policy` shown as runtime-settable via SET GLOBAL**: The post used `SET GLOBAL audit_log_policy = '...'` statements. This variable is read-only at runtime and can only be set at server startup in `my.cnf`. Replaced the SQL statements with `my.cnf` configuration examples. Also added a deprecation note (deprecated as of MySQL 8.0.34).

3. **JSON audit log entry format was inaccurate**: The example showed `"event": "query"`, a top-level `"db"` field, and a top-level `"query"` field. In the actual MySQL Enterprise Audit JSON format, query events use `"event": "status"`, query data is nested under a `"general_data"` object (containing `command`, `sql_command`, `query`, and `status` fields), and there is no top-level `db` field. Fixed to match the documented format.

4. **Python parsing script referenced wrong JSON path**: The script used `entry.get('query', '')` which wouldn't find the query in the actual JSON structure. Fixed to `entry.get('general_data', {}).get('query', '')`.

5. **`audit_log_rotate()` missing version requirement**: This UDF was introduced in MySQL 8.0.31. Added version note "(MySQL 8.0.31+)" to the rotation section.

## Review Notes
- The cron job example uses a plaintext password on the command line (`-p'secret'`), which is visible in process listings and shell history. A production setup should use `mysql_config_editor` or a `~/.my.cnf` credentials file instead. This is a best-practice concern rather than a technical error.
- The audit log filter JSON examples use a single object for `class` rather than an array. Both forms appear in MySQL documentation, so this was left as-is.
- The post appropriately includes a disclaimer note at the top about Enterprise vs. Community Edition.
