# Validation Summary: How to Benchmark INSERT Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, `numbers()` table function, `system.events`)
- `clickhouse-client` CLI
- Bash scripting (GNU `date`, background jobs)
- SQL / ClickHouse SQL dialect (LowCardinality, DateTime, UInt64, Float64)

## Sources Consulted
- ClickHouse SQL Reference — CREATE TABLE / MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Table Functions — `numbers()`: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse Data Types — Array (1-based indexing): https://clickhouse.com/docs/en/sql-reference/data-types/array
- ClickHouse System Tables — `system.events`: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse `clickhouse-client` docs: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse ProfileEvents source (`src/Common/ProfileEvents.cpp`)
- GNU coreutils `date` manual (`%s`, `%N`, `%3N` format specifiers)

## Issues Found
- **Section heading mismatch**: the heading read "Monitoring INSERT Performance from system.metrics" but the query it introduces selects from `system.events`. These are distinct tables in ClickHouse (`system.metrics` = current gauges; `system.events` = cumulative counters). Changed the heading to "Monitoring INSERT Performance from system.events" so it matches the code.

## Review Notes
- Event counter names (`InsertQuery`, `InsertedRows`, `InsertedBytes`, `MergedRows`, `MergedUncompressedBytes`) are all canonical ProfileEvents and valid in `system.events`.
- Array indexing (`[rand() % 3 + 1]`) is correct because ClickHouse arrays are 1-based.
- `now() - rand() % 86400` works (ClickHouse treats the integer as seconds when subtracting from DateTime), though `now() - INTERVAL X SECOND` or `subtractSeconds(now(), X)` is the more idiomatic form recommended in the docs; this is a style preference, not an error.
- `date +%s%3N` is Linux/GNU-only; it will not produce milliseconds on BSD/macOS `date`. Readers on macOS may need `gdate` from coreutils. Not changed, since the rest of the shell is Linux-oriented.
- The `TRUNCATE TABLE` inside the batch-size loop is the right call to isolate each run, but note it creates an implicit merge/cleanup cost that could skew the very first timing on cold tables — worth mentioning in a future revision.
