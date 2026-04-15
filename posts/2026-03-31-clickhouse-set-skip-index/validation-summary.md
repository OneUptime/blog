# Validation Summary: How to Use Set Skip Index in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, data skipping indices)
- SQL (DDL, DML, EXPLAIN)
- LowCardinality column encoding
- bloom_filter skip index (mentioned as alternative)

## Sources Consulted
- ClickHouse documentation on data skipping indices: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse documentation on set index type: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#set
- ClickHouse documentation on ALTER TABLE ADD INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse documentation on EXPLAIN: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse documentation on system.data_skipping_indices: https://clickhouse.com/docs/en/operations/system-tables/data_skipping_indices

## Issues Found

1. **Incorrect block skipping example**: The "How Set Works" section stated that a query `WHERE level = 'error'` skips only block 2. However, block 0 (containing `{'info', 'warn'}`) also does not contain `'error'` and should be skipped as well. Fixed to state that both blocks 0 and 2 are skipped and only block 1 needs to be read.

2. **Misleading query for choosing N**: The "Choosing N" section had a comment saying "Check how many distinct values typically appear in a granule" but the query (`SELECT level, count() ... GROUP BY level`) actually counted rows per value (the value distribution), not distinct values per granule. Replaced with `SELECT countDistinct(level)` which directly gives the total number of distinct values — the key metric for choosing an appropriate N.

## Review Notes
- The `system.data_skipping_indices` query for checking index memory footprint uses `data_compressed_bytes`, which is available in recent ClickHouse versions. Older versions may not have this column.
- The benchmarking section uses `randomString(100)` which generates random bytes (possibly non-printable). This is fine for benchmarking purposes but `randomPrintableASCII(100)` would produce more human-readable data if someone inspects the table.
- The `set(0)` behavior (unlimited stored values) is correctly documented. This is a commonly misunderstood feature.
- All SQL syntax (CREATE TABLE with INDEX, ALTER TABLE ADD INDEX, MATERIALIZE INDEX, EXPLAIN indexes = 1) is correct for current ClickHouse versions.
