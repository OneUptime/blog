# Validation Summary: How to Optimize ClickHouse Queries with Data Skipping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Data skipping indexes (secondary indexes): minmax, set, bloom_filter, ngrambf_v1
- ClickHouse SQL (ALTER TABLE ADD INDEX, MATERIALIZE INDEX, EXPLAIN)
- ClickHouse system tables (system.data_skipping_indices, system.parts)

## Sources Consulted
- ClickHouse docs — MergeTree data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse docs — ALTER INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse docs — EXPLAIN: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse docs — system.data_skipping_indices and system.parts

## Issues Found
1. **`ngrambf_v1` parameter naming** — The post described the second parameter as "hash table size". The official parameter name is `size_of_bloom_filter_in_bytes` — it is the bloom filter size in bytes, not a hash table size. Updated the parameter description to "n-gram size, bloom filter size in bytes, number of hash functions, random seed" to match the official ClickHouse documentation.

## Review Notes
- `ADD INDEX name (expr) TYPE type GRANULARITY value` syntax is correct; parenthesized expression is accepted.
- `MATERIALIZE INDEX` is the correct way to build an index over existing data after adding it.
- `set(max_rows)` — per-granule unique-value cap claim is accurate per official docs.
- `bloom_filter(0.01)` false positive rate description is correct (default is 0.025).
- `system.data_skipping_indices` also exposes `data_compressed_bytes` per index, which is more directly useful for measuring per-index storage overhead than the `system.parts` query shown; the post's `system.parts` query is still technically valid for measuring overall part storage, so no change was required.
