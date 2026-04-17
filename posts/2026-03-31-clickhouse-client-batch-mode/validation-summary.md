# Validation Summary: How to Use clickhouse-client Batch Mode for Scripting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database)
- clickhouse-client (CLI)
- Bash / shell scripting
- SQL (DDL, DML, ALTER)
- Data formats: TabSeparated, CSV, CSVWithNames, JSON, JSONEachRow, Vertical

## Sources Consulted
- ClickHouse official docs — clickhouse-client: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse official docs — Formats: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse official docs — formatDateTime: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#formatdatetime
- ClickHouse official docs — ALTER TABLE ADD INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse official docs — Settings (format_csv_delimiter): https://clickhouse.com/docs/en/operations/settings/settings-formats
- GNU coreutils `date` manual for `--date` / `-u` flags

## Issues Found
No technical issues found.

Verified specifically:
- All CLI flags exist and are spelled correctly: `--query`, `--queries-file`, `--multiquery`, `--format`, `--host`, `--user`, `--password`, `--config-file`, `--progress`, `--format_csv_delimiter`.
- `--progress 0` is a valid way to disable progress output (the flag accepts `0|off|false|no`).
- All format names are valid: `TabSeparated`, `CSV`, `CSVWithNames`, `JSON`, `JSONEachRow`, `Vertical`.
- `formatDateTime` specifiers `%Y-%m-%d %H:%i:%S` are correct for ClickHouse (`%i` is the minute specifier in ClickHouse's MySQL-compatible format syntax).
- `WHERE day >= today() - 7` using a SELECT alias in WHERE is supported by ClickHouse's alias substitution.
- `ADD COLUMN IF NOT EXISTS` and `ADD INDEX IF NOT EXISTS` syntax are both supported.
- Bloom filter skip index syntax (`TYPE bloom_filter GRANULARITY 1`) is correct.
- `uniq()`, `count()`, `toDate()`, `today()`, `now()`, `sum()`, and `version()` are all valid ClickHouse functions.
- INSERT with column list before FORMAT (`INSERT INTO events (user_id, event, ts) FORMAT TabSeparated`) is valid syntax.
- GNU `date -u +%Y-%m-%d --date="yesterday"` is valid on Linux systems using GNU coreutils.

## Review Notes
- The `--multiquery` (and its shorthand `-n`) flag has been deprecated since ClickHouse 24.2 because multi-statement queries are enabled by default. The flag still works for backwards compatibility, so the examples remain functional, but readers on newer versions may find it unnecessary.
- In the "Error Handling in Scripts" example, `set -e` plus the subsequent `if [ $? -eq 0 ]` check is slightly redundant: with `set -e`, a failed `clickhouse-client` invocation exits the script immediately, so the `else` branch is effectively unreachable. The intent is clear and the script is still correct; just a stylistic note.
- ClickHouse also supports native environment variables (`CLICKHOUSE_HOST`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`) which are picked up automatically by `clickhouse-client` without needing `--host`/`--user`/`--password` flags. The post's custom `CH_*` variables work fine but aren't the idiomatic approach.
- The post references "see the config file guide" for credentials but does not link to it; this is a content/cross-reference nit, not a technical error.
