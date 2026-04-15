# Validation Summary: How to Aggregate Large Files with clickhouse-local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-local
- CSV and Parquet file formats
- External aggregation (spill-to-disk)
- Glob patterns for multi-file processing

## Sources Consulted
- ClickHouse clickhouse-local documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-local
- ClickHouse file() table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse query complexity settings (max_memory_usage, max_bytes_before_external_group_by): https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse formats documentation (CSVWithNames, Parquet): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse date-time functions (toStartOfMonth): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- **SAMPLE clause used with file() table function (line 101)**: The `SAMPLE 0.01` clause was used on a query reading from `file('large.csv', CSVWithNames)`. The ClickHouse `SAMPLE` clause only works with MergeTree-family tables that have a `SAMPLE BY` expression defined in their DDL. It does not work with the `file()` table function and would produce an error. Replaced `SAMPLE 0.01` with `WHERE rand() % 100 = 0`, which achieves approximate 1% random sampling on any data source. Also updated the Summary section to reference `rand()` filtering instead of `SAMPLE`.

## Review Notes
- All other CLI flags (`--max_memory_usage`, `--max_bytes_before_external_group_by`, `--max_rows_to_read`, `--max_threads`, `--progress`, `--format`) are valid ClickHouse settings that work correctly with clickhouse-local.
- The `file()` table function syntax and glob pattern usage are correct.
- The `toStartOfMonth()` function and all SQL syntax are correct.
- The `rand() % 100 = 0` approach provides approximate 1% sampling but is not perfectly uniform due to modular bias. For practical purposes with large files, this is sufficient. An alternative would be `WHERE cityHash64(rowNumberInAllBlocks()) % 100 = 0` for deterministic sampling.
- The section title "Streaming Aggregation Without Loading All Data" is slightly misleading since `--max_rows_to_read` throws an exception when exceeded rather than streaming, but it does effectively limit data read for preview purposes.
