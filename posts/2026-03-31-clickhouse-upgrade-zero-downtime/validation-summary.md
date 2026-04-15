# Validation Summary: How to Upgrade ClickHouse with Zero Downtime

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse (server, client, replication, system tables)
- ClickHouse BACKUP/RESTORE (S3 destination)
- Debian/Ubuntu package management (apt-get)
- Bash scripting for rolling upgrade automation
- ClickHouse system tables: system.replicas, system.mutations, system.processes, system.text_log, system.settings, system.tables

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/whats-new/changelog (version scheme)
- ClickHouse GitHub releases: https://github.com/ClickHouse/ClickHouse/releases (version format verification)
- ClickHouse BACKUP statement docs: https://clickhouse.com/docs/en/sql-reference/statements/backup (ASYNC syntax)
- ClickHouse SYSTEM statements docs: https://clickhouse.com/docs/en/sql-reference/statements/system (SYSTEM command listing)
- ClickHouse system.replicas docs: https://clickhouse.com/docs/en/operations/system-tables/replicas (column names)
- ClickHouse system.mutations docs: https://clickhouse.com/docs/en/operations/system-tables/mutations (column names)
- ClickHouse system.settings docs: https://clickhouse.com/docs/en/operations/system-tables/settings (is_obsolete, changed columns)
- ClickHouse system.text_log docs: https://clickhouse.com/docs/en/operations/system-tables/text_log (level enum values)
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http (/ping endpoint)

## Issues Found

1. **Version scheme incorrectly described**: The post stated ClickHouse uses a `major.minor.patch.build` scheme with a 5-segment example (`24.3.5.46.1`). ClickHouse actually uses calendar-based versioning (`year.month.patch.build`) with 4 segments. Fixed the description to `year.month.patch.build` and the example to `24.3.5.46`.

2. **BACKUP ASYNC syntax wrong**: The post used `SETTINGS async = true` after the BACKUP statement. In ClickHouse, `ASYNC` is a keyword appended directly to the statement, not a SETTINGS parameter. Changed to `ASYNC;` on its own line.

3. **Non-existent SYSTEM command**: The post used `SYSTEM WAIT MUTATIONS;` which does not exist in ClickHouse. There is no system command to block until mutations complete. Replaced with a polling query against `system.mutations WHERE is_done = 0` which is the standard approach.

4. **Suboptimal settings filter**: The post used `value != default` to find modified obsolete settings. While syntactically valid, ClickHouse provides a dedicated `changed` column (UInt8) in `system.settings` that is more reliable and idiomatic. Changed to `changed = 1`.

## Review Notes
- The version comparison in the post-upgrade validation script (`if [ "$version" != "$TARGET_VERSION" ]`) does a string comparison. ClickHouse's `SELECT version()` may return a version string that doesn't exactly match the package version string (e.g., it may omit the final build segment). This is noted but not changed since it depends on the specific ClickHouse build.
- The rolling upgrade script uses `apt-get install` which will also restart the service in some package configurations. The script then explicitly calls `systemctl restart`, which is fine (idempotent) but worth noting for awareness.
- The post correctly recommends stepping through intermediate minor versions for large version jumps, which aligns with ClickHouse best practices.
