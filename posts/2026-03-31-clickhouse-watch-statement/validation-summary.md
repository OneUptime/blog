# Validation Summary: How to Use WATCH Statement in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- WATCH statement
- LIVE VIEW (experimental/deprecated feature)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation on WATCH statement: https://clickhouse.com/docs/en/sql-reference/statements/watch
- ClickHouse official documentation on CREATE VIEW / LIVE VIEW: https://clickhouse.com/docs/en/sql-reference/statements/create/view#live-view
- ClickHouse GitHub repository (v19.14 and v23.8 tags) for LIVE VIEW history and StorageLiveView source code
- ClickHouse clickhouse-client CLI documentation and source code for flag verification

## Issues Found

1. **WATCH EVENTS syntax was incorrect (line 65):** The blog used `WATCH EVENTS analytics.events_live;` but the correct ClickHouse syntax places `EVENTS` after the view name: `WATCH analytics.events_live EVENTS;`. The official grammar is `WATCH [db.]live_view [EVENTS] [LIMIT n]`. Fixed to `WATCH analytics.events_live EVENTS;`.

2. **Incorrect version claim (line 27):** The blog stated Live Views are "available since ClickHouse 21.x". LIVE VIEW was actually introduced as an experimental feature around ClickHouse 19.14 (2019), via PR #5541. Fixed to "available as an experimental feature since ClickHouse 19.14".

3. **Invalid CLI flag `--setting` (lines 75 and 84):** The blog used `--setting allow_experimental_live_view=1` with `clickhouse-client`. There is no `--setting` flag in clickhouse-client. ClickHouse settings are passed directly as their own CLI flags. Fixed both occurrences to `--allow_experimental_live_view=1`.

## Review Notes
- LIVE VIEW and the WATCH statement are marked as **deprecated** in current ClickHouse versions (v24+) and are expected to be removed in a future release. The blog does not mention this deprecation. While not a factual error in the post's content, readers should be aware that this feature may not be available in newer ClickHouse releases. A future update to the post could add a deprecation notice.
- The `KILL QUERY` approach for cancelling a WATCH is technically valid (it works on any running query via `system.processes`) but is not specifically documented for WATCH in the official docs. The official docs only mention Ctrl+C. The blog's claim is reasonable and correct in practice.
- All SQL syntax (CREATE LIVE VIEW, SELECT queries, aggregate functions like `count()`, `countIf()`, `toStartOfMinute()`, `generateUUIDv4()`, `round()`) is correct ClickHouse SQL.
