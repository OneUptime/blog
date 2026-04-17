# Validation Summary: How to Automate ClickHouse Performance Reporting

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (system tables, SQL functions)
- Bash scripting
- cron
- `clickhouse-client` CLI
- `mail` command
- `curl` (for pushing metrics to OneUptime)

## Sources Consulted
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables
- `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `system.merges`: https://clickhouse.com/docs/en/operations/system-tables/merges
- `system.disks`: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse string functions (`normalizeQuery`): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse formatting functions (`formatReadableSize`): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- `clickhouse-client` documentation: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse Formats reference (`TSV`, `TSVRaw`): https://clickhouse.com/docs/en/interfaces/formats

## Issues Found
No technical issues found.

- The referenced system tables (`system.query_log`, `system.merges`, `system.parts`, `system.disks`) all exist in ClickHouse and have the columns used in the queries (`query`, `query_duration_ms`, `event_time`, `type`, `database`, `table`, `rows_read`, `name`, `free_space`, `total_space`).
- `type = 'QueryFinish'` is a valid enum value in `system.query_log.type`.
- `normalizeQuery()` and `formatReadableSize()` are valid ClickHouse functions used correctly.
- `GROUP BY normalized` referencing an output alias is supported by ClickHouse.
- The `INTERVAL 1 DAY` / `INTERVAL 1 HOUR` syntax with `now() -` is valid ClickHouse syntax.
- `clickhouse-client --query "..." FORMAT TSV` and `--format TSVRaw` are both valid CLI usages.
- The cron expression `0 8 * * *` is syntactically correct (runs daily at 08:00).
- The bash script uses correct shell constructs, command substitution, and heredoc-style quoting.

## Review Notes
- The `system.query_log` table must be enabled in the server configuration (it is enabled by default in modern ClickHouse versions, but readers running older custom configurations may need to enable it).
- The `mail` command used in the cron script depends on having a working local MTA (e.g., `mailutils`/`bsd-mailx` and a configured sendmail/postfix); this is environmental and not a technical error.
- For very busy systems, filtering `system.query_log` with `event_time >= now() - INTERVAL 1 DAY` without an additional index hint may be expensive, but this is a performance consideration rather than a correctness issue.
- The OneUptime ingest endpoint URL (`https://oneuptime.example.com/api/ingest`) is an illustrative placeholder, which is appropriate for the example.
