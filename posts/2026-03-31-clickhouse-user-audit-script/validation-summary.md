# Validation Summary: How to Write a ClickHouse User Audit Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system tables: `system.users`, `system.grants`, `system.role_grants`, `system.query_log`)
- Bash scripting
- ClickHouse HTTP interface (port 8123, curl-based queries)
- cron scheduling

## Sources Consulted
- ClickHouse official documentation for system tables: `system.users`, `system.grants`, `system.role_grants`, `system.query_log`
- ClickHouse documentation for `dateDiff` function syntax
- ClickHouse documentation for HTTP interface query submission via curl
- ClickHouse documentation for `query_log` type enum values (`QueryStart`, `QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`)
- ClickHouse documentation on aggregate function behavior with empty sets (returns type default, not NULL)
- Cross-referenced with other validated ClickHouse blog posts in the repository (e.g., `clickhouse-system-query-log`, `clickhouse-users-and-roles-sql`, `clickhouse-system-role-grants`, `clickhouse-how-to-use-default-values-for-different-data-types-in-clickh`)

## Issues Found

1. **Dead `IS NULL` clause in inactive users query (Medium severity)**
   - **What was wrong:** The `HAVING` clause included `OR last_query IS NULL`, but in ClickHouse `max()` on an empty set returns the DateTime type default (`1970-01-01 00:00:00`), not NULL. This made the `IS NULL` branch dead code that would never evaluate to true.
   - **What was changed:** Removed `OR last_query IS NULL` from the `HAVING` clause. The query still correctly catches users with no query history because `1970-01-01` satisfies `< now() - INTERVAL 30 DAY`.
   - **Why:** Eliminates misleading dead code. Readers copying this query might rely on the `IS NULL` branch and be confused when debugging, or incorrectly assume ClickHouse aggregates behave like PostgreSQL/MySQL where `max()` on empty sets returns NULL.

2. **Destructive crontab command (High severity)**
   - **What was wrong:** `echo "..." | crontab -` replaces the entire crontab with only the piped content, silently deleting all existing cron jobs.
   - **What was changed:** Replaced with the safe append pattern: `(crontab -l 2>/dev/null; echo "...") | crontab -`, which preserves existing cron entries and appends the new job.
   - **Why:** The original command is a data-loss risk. Readers running it in production would lose all other scheduled tasks without warning.

## Review Notes
- The `exception LIKE '%Authentication%'` filter for login failures is reasonable but may not catch all authentication error variants (e.g., case differences or alternate phrasing like "Access denied"). This is acceptable for a general audit script but readers doing strict compliance audits may want to test against their specific ClickHouse version's error messages.
- All system table column names (`system.users`, `system.grants`, `system.role_grants`, `system.query_log`) were verified as correct.
- The curl-based HTTP interface usage (port 8123, `--data-binary`, `-u` for auth) is correct.
- The `dateDiff('day', ...)` function syntax and argument order are correct.
- The `FORMAT PrettyCompactMonoBlock` output format is appropriate for scripted audit reports.
