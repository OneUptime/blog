# Validation Summary: How to Audit User Activity in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (General Query Log, Performance Schema, triggers, error log)
- Percona Audit Log Plugin
- MySQL Enterprise Audit (mentioned)
- MySQL 8.0 failed-login tracking (ALTER USER)

## Sources Consulted
- MySQL 8.0 Reference Manual — General Query Log: https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual — Performance Schema events_statements_history_long table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-history-long-table.html
- MySQL 8.0 Reference Manual — Performance Schema threads table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual — ALTER USER (failed-login tracking): https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — information_schema.processlist: https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- Percona Audit Log Plugin documentation: https://docs.percona.com/percona-server/8.0/audit-log-plugin.html

## Issues Found

1. **Performance Schema query used `CURRENT_USER` which is not a column in `events_statements_history_long`** — MySQL silently evaluates `CURRENT_USER` as the built-in `CURRENT_USER()` function, which returns the current session's user for every row rather than the user who actually executed each historical statement. Fixed by joining with `performance_schema.threads` on `THREAD_ID` and selecting `PROCESSLIST_USER` instead.

2. **Misleading comments in Method 3** — The comment "Enable failed login tracking" was inaccurate; the SQL enables general statement instrumentation (`statement/sql/%`), not failed-login tracking specifically. Changed to "Enable statement instrumentation". The comment "View recent connections" was also wrong since the query retrieves recent statements, not connections. Changed to "View recent statements with user info".

3. **Method 4 title "Login History via Plugin" was incorrect** — The `FAILED_LOGIN_ATTEMPTS` and `PASSWORD_LOCK_TIME` clauses of `ALTER USER` are a built-in MySQL Server feature introduced in MySQL 8.0.19, not a plugin. Changed title to "Failed-Login Tracking (MySQL 8.0.19+)".

## Review Notes
- The `information_schema.processlist` table used in the "Querying Connection Events" section is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. The query still works but readers targeting newer MySQL versions should be aware of this deprecation.
- The Percona Server installation command (`apt install percona-mysql-server`) requires Percona's APT repository to be configured first. The post does not mention this prerequisite, which could confuse readers using standard Ubuntu repositories.
- The general query log should carry a stronger performance warning for production use — it logs every statement and can significantly impact performance and disk usage on busy servers. The summary section does note it is "good for development" which partially addresses this.
