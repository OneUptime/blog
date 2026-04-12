# Validation Summary: How to Use MySQL Audit Plugin for Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Enterprise Audit (audit_log plugin)
- MySQL Server configuration (my.cnf)
- Filebeat (for SIEM log forwarding)
- Elasticsearch (as SIEM target)

## Sources Consulted
- MySQL 8.0 Reference Manual — Audit Log Reference: https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual — Audit Log Filtering: https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html
- MySQL 8.0 Reference Manual — Writing Audit Log Filter Definitions: https://dev.mysql.com/doc/refman/8.0/en/audit-log-filter-definitions.html
- MySQL 8.0 Reference Manual — Legacy Mode Audit Log Filtering: https://dev.mysql.com/doc/refman/8.0/en/audit-log-legacy-filtering.html
- MySQL 8.0.31 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-31.html

## Issues Found

1. **`SET GLOBAL audit_log_format` used incorrectly**: `audit_log_format` is a read-only system variable that can only be set at server startup, not at runtime with `SET GLOBAL`. Changed the section to show `my.cnf` configuration instead.

2. **`SET GLOBAL audit_log_policy` used incorrectly**: `audit_log_policy` is also a read-only, startup-only variable. Changed the section to show `my.cnf` configuration instead. Also added a note that it is deprecated as of MySQL 8.0.34 in favor of rule-based filtering.

3. **JSON described as default format**: The post's comment stated JSON is the "default" format. The actual default for `audit_log_format` is `NEW` (new-style XML), not `JSON`. Corrected the comment to recommend JSON without calling it the default, and listed all valid values with their descriptions.

4. **Incorrect audit filter JSON syntax for multi-class filtering**: The `audit_log_filter_set_filter()` call for the admin user used `{ "filter": { "log": true, "class": { "name": [...] } } }`, which does not match the documented syntax. The official MySQL docs specify multi-class filtering as `{ "filter": { "class": [ { "name": "connection" }, { "name": "table_access" } ] } }`. Corrected to match the documented format.

## Review Notes
- `audit_log_rotate()` was introduced in MySQL 8.0.31. The post does not specify a minimum MySQL version, so readers on older versions would not have this function available. They would need to use `SET GLOBAL audit_log_flush = ON` instead.
- The JSON log samples are representative approximations of the actual MySQL Enterprise Audit JSON output format. The real output structure can vary slightly depending on the event type and MySQL version.
- The `grep`-based log parsing examples work but are fragile for structured JSON data. For production use, a JSON-aware tool like `jq` would be more reliable.
- The post correctly and consistently notes that MySQL Enterprise Audit is an Enterprise Edition feature, with appropriate guidance for Community Edition users.
