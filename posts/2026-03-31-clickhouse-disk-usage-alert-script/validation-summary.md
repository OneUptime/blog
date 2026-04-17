# Validation Summary: How to Write a ClickHouse Disk Usage Alert Script

## Status
validated

## Post Type
Tutorial / Guide (operational scripting)

## Technologies Covered
- ClickHouse (system.disks, system.parts, HTTP interface)
- ClickHouse SQL functions: `formatReadableSize`, `round`, `toString`
- ClickHouse output formats: `PrettyCompactMonoBlock`, `TabSeparated`
- Bash scripting (process substitution, parameter expansion, exit codes)
- curl (HTTP basic auth against ClickHouse)
- cron / crontab scheduling

## Sources Consulted
- ClickHouse `system.disks` documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse other functions (formatReadableSize): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse formats (PrettyCompactMonoBlock, TabSeparated): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse HTTP interface (port 8123, basic auth): https://clickhouse.com/docs/en/interfaces/http

## Issues Found
No technical issues found.

All SQL queries reference valid columns on `system.disks` (`name`, `path`, `total_space`, `free_space`) and `system.parts` (`database`, `table`, `disk_name`, `bytes_on_disk`, `active`, `rows`). `formatReadableSize()`, `round()`, and `toString()` are valid ClickHouse functions. Output formats `PrettyCompactMonoBlock` and `TabSeparated` are valid. The HTTP interface default port 8123 and basic auth via `curl -u user:password` are correct. The bash script's process substitution, parameter expansion (`${used_pct%.*}`), and exit-code handling are syntactically correct.

## Review Notes
- The `used_pct` expression `(total_space - free_space) * 100.0 / total_space` will divide by zero on disks where `total_space` is reported as 0 (some object-storage disk configurations). A defensive `nullIf(total_space, 0)` would harden it, but this is an edge case and not a correctness bug for typical local-disk setups.
- The cron snippet runs the script twice on failure (`cmd || cmd | mail`). This is intentional — silent on success, email-on-alert — but wasteful. A single invocation capturing output conditionally would be more efficient. Not a technical error.
- `PrettyCompactMonoBlock` is well-suited to terminal/log output; for automated parsing the script correctly switches to `TabSeparated` in the threshold-check loop.
