# Validation Summary: How to Batch Inserts Efficiently in ClickHouse

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, `system.parts`, `system.query_log`)
- ClickHouse settings: `max_insert_block_size`, `min_insert_block_size_rows`, `min_insert_block_size_bytes`, `parts_to_delay_insert`, `parts_to_throw_insert`
- `clickhouse-driver` Python library
- `clickhouse-go` v2 (`github.com/ClickHouse/clickhouse-go/v2`)
- `clickhouse-client` CLI
- ClickHouse HTTP interface (port 8123)
- Input formats: CSV, JSONEachRow, Parquet

## Sources Consulted
- ClickHouse MergeTree settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse `system.parts`: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse HTTP interface: https://clickhouse.com/docs/interfaces/http
- ClickHouse Input/Output formats: https://clickhouse.com/docs/sql-reference/formats
- clickhouse-driver docs: https://clickhouse-driver.readthedocs.io/en/latest/quickstart.html
- clickhouse-go v2 examples: https://github.com/ClickHouse/clickhouse-go (examples/clickhouse_api/batch.go)
- ClickHouse source (`src/Common/ErrorCodes.cpp`, `src/Storages/MergeTree/MergeTreeSettings.cpp`, `src/Core/Defines.h`) for default values

## Issues Found

1. **Incorrect `parts_to_delay_insert` / `parts_to_throw_insert` thresholds.** The post stated that inserts are delayed past 300 parts and rejected past 1,000. These were the pre-23.6 defaults. Current defaults are `parts_to_delay_insert = 1000` and `parts_to_throw_insert = 3000`. Updated the prose and the exception snippet to reflect current defaults and to name the settings, and adjusted the example error count from 1001 to 3001.

2. **Incorrect `min_insert_block_size_rows` default.** The post claimed the default was `0` ("no minimum"). The actual default is `1,048,449` rows (the `DEFAULT_INSERT_BLOCK_SIZE` constant), and `min_insert_block_size_bytes` defaults to `268,402,944` bytes (~256 MiB), not 0. A value of 0 would *disable* the setting but is not the default. Updated the comment block to state the real defaults.

3. **Minor: `max_insert_block_size` default value.** The post rounded the default to 1,048,576. The exact default is `1,048,449` (1,048,576 minus a small SIMD padding). Updated the comment to the exact value.

## Review Notes
- clickhouse-go v2 API usage (`clickhouse.Open`, `PrepareBatch`, `Append`, `Send`) is correct. For production code, readers should also check the `error` returns from `Send()` and `Append()` and typically `defer batch.Close()` — the blog example elides these for brevity, which is acceptable for a tutorial snippet.
- The `system.parts` and `system.query_log` column names (`partition`, `rows`, `bytes_on_disk`, `active`, `table`, `type='QueryFinish'`, `query_kind='Insert'`, `written_rows`) all match the current docs.
- The HTTP API examples, port 8123, `Content-Encoding: gzip`, and passing `max_insert_block_size` as a URL query parameter are all correct.
- The clickhouse-driver `client.execute('INSERT INTO ... VALUES', batch)` pattern is correct.
- The "Too many parts" error code `252` is correct (`TOO_MANY_PARTS` in ClickHouse sources).
- The `partition` column from `system.parts` in the monitoring query is a `String` of the partition expression; ordering by it works fine in practice but is lexicographic rather than chronological — not an error, just a caveat.
- The `min_insert_block_size_*` settings govern server-side block squashing behavior and are especially relevant when using async inserts; the post's general guidance to raise them for write-heavy tables is reasonable.
