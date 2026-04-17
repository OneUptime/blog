# Validation Summary: How to Benchmark Compression Ratios in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Compression codecs: LZ4, ZSTD, Delta, Gorilla
- ClickHouse system tables: `system.parts`, `system.columns`
- `clickhouse-client` CLI
- SQL DDL: `CREATE TABLE ... AS`, `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)`, `OPTIMIZE TABLE ... FINAL`

## Sources Consulted
- ClickHouse column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.columns`: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse `ALTER TABLE ... MODIFY COLUMN`: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse `OPTIMIZE TABLE`: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- `clickhouse-client` command-line options: https://clickhouse.com/docs/en/interfaces/cli
- `formatReadableSize` function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize

## Issues Found
No technical issues found.

- The `CREATE TABLE bench_xxx AS my_large_table ENGINE = MergeTree() ORDER BY id` syntax is valid — `AS source_table` copies the column structure, and you can override the engine clause.
- `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` correctly changes the codec for subsequent writes, which is why the post inserts data *after* the ALTER.
- `CODEC(Delta(4), LZ4)` is valid — `Delta(delta_bytes)` accepts 1, 2, 4, or 8; 4 fits a 32-bit DateTime.
- `CODEC(Gorilla, LZ4)` is valid for floating-point columns (Gorilla is designed for Float32/Float64).
- `system.parts` columns `data_compressed_bytes`, `data_uncompressed_bytes`, and `active` are correct.
- `system.columns` exposes `data_compressed_bytes` and `data_uncompressed_bytes` (per-column storage stats).
- `clickhouse-client --query "..." --time` — `--time` (or `-t`) is a valid flag that prints execution time to stderr.
- `OPTIMIZE TABLE ... FINAL` forces a merge of all parts in all partitions (subject to `max_bytes_to_merge_at_max_space_in_pool`).
- `formatReadableSize` is a valid ClickHouse function.

## Review Notes
- The `bench_default` table inherits whatever codec `my_large_table` already has. If the source columns already use a non-default codec, the "default" baseline will reflect that rather than LZ4. Readers wanting a true LZ4 baseline should either explicitly `MODIFY COLUMN ... CODEC(LZ4)` or rely on the `bench_lz4` table for the comparison.
- `OPTIMIZE TABLE ... FINAL` can be expensive on large tables and may not fully merge parts above `max_bytes_to_merge_at_max_space_in_pool` (default 150 GB). For very large benchmark tables, readers may need to tune this setting or accept partial merges.
- Compression ratios in the "Interpreting Results" table are presented as rough rules of thumb; actual ratios vary significantly with data distribution, cardinality, and ordering. The post correctly frames this as general guidance.
- Gorilla codec specifically targets Float32/Float64 — using it on integer columns will error out, which is worth noting for readers adapting the example to their own schema.
