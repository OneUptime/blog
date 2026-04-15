# Validation Summary: How to Use system.data_skipping_indices in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse
- system.data_skipping_indices system table
- Data skipping indexes (minmax, set, bloom_filter, ngrambf_v1, tokenbf_v1)
- MergeTree engine family
- system.query_log

## Sources Consulted
- ClickHouse official docs: system.data_skipping_indices (https://clickhouse.com/docs/operations/system-tables/data_skipping_indices)
- ClickHouse official docs: Data Skipping Indexes (https://clickhouse.com/docs/optimize/skipping-indexes/examples)
- ClickHouse official docs: ALTER TABLE ... ADD/MATERIALIZE INDEX (https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index)
- ClickHouse official docs: system.query_log (https://clickhouse.com/docs/operations/system-tables/query_log)

## Issues Found
1. **Incorrect use of LIKE on Array column in query_log query**: The `tables` column in `system.query_log` is of type `Array(LowCardinality(String))`, not a plain `String`. Using `tables LIKE '%events%'` is invalid because `LIKE` cannot operate directly on an array. Fixed by replacing `tables LIKE '%events%'` with `has(tables, 'mydb.events')`, which correctly checks for array membership using the fully-qualified table name.

## Review Notes
- All column names used for `system.data_skipping_indices` (database, table, name, type, type_full, expr, granularity, data_compressed_bytes, data_uncompressed_bytes) are confirmed correct.
- The ALTER TABLE ADD INDEX and MATERIALIZE INDEX syntax examples are correct.
- The skip index types listed (minmax, set, bloom_filter, ngrambf_v1, tokenbf_v1) are all valid ClickHouse skip index types.
- The LEFT JOIN query to find tables without skip indexes is syntactically correct and logically sound.
- The table also has additional columns (`creation`, `marks_bytes`) not mentioned in the post, but omitting them is fine for a focused tutorial.
