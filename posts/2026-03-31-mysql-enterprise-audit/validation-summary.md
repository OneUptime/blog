# Validation Summary: How to Use MySQL Enterprise Audit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Audit plugin (`audit_log`)
- MySQL 8.0 rule-based audit filtering

## Sources Consulted
- MySQL 8.0 Reference Manual — MySQL Enterprise Audit: https://dev.mysql.com/doc/refman/8.0/en/audit-log.html
- MySQL 8.0 Reference Manual — Audit Log Reference (system variables): https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual — Audit Log Filtering: https://dev.mysql.com/doc/refman/8.0/en/audit-log-filtering.html

## Issues Found

1. **`SET GLOBAL audit_log_format` is not valid at runtime**: The post suggested using `SET GLOBAL audit_log_format = 'JSON'` to change the audit log format. However, `audit_log_format` is not a dynamic variable — it can only be set at server startup in `my.cnf` or on the command line. Replaced the SQL example with a note stating this variable is startup-only.

2. **Invalid `%` wildcard in filter class name**: The filter definition `{ "filter": { "class": { "name": "%" } } }` used `%` as a wildcard for class names, but this is not documented syntax for the JSON filter definition. The `%` wildcard is valid for user specifications in `audit_log_filter_set_user()`, but not for class names within the filter JSON itself. Changed to `{ "filter": { "log": true } }`, which is the documented way to create a filter that logs all events.

## Review Notes
- `audit_log_policy` is noted as a legacy variable in MySQL 8.0 when rule-based filtering is in use. The post correctly shows both approaches (policy-based and filter-based) but does not explicitly note that rule-based filtering supersedes `audit_log_policy`. This is acceptable for an introductory tutorial.
- The `audit_log_rotate()` function was introduced in MySQL 8.0.31. Earlier 8.0 versions use `SET GLOBAL audit_log_flush = ON` for rotation. The post does not specify a sub-version, which is fine for a general guide but readers on older 8.0.x releases may need the alternative.
- The sample JSON audit log entry uses ISO 8601 format (`2026-03-31T14:23:01Z`) for the timestamp, whereas the actual MySQL JSON audit log uses a space-separated format (`2026-03-31 14:23:01`). This is a minor cosmetic difference in an illustrative sample and does not affect functionality.
