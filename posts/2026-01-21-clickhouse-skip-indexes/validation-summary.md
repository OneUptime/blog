# Validation Summary: How to Index Data in ClickHouse with Skip Indexes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- ClickHouse
- MergeTree data skipping indexes
- minmax indexes
- set indexes
- Bloom filter indexes
- tokenbf_v1 and ngrambf_v1 indexes
- ClickHouse SQL and system tables

## Sources Consulted
- ClickHouse Docs: Understanding ClickHouse data skipping indexes - https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse Docs: Data skipping index examples - https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse Docs: Use data skipping indices where appropriate - https://clickhouse.com/docs/best-practices/use-data-skipping-indices-where-appropriate
- ClickHouse Docs: Manipulating Data Skipping Indices - https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse Docs: MergeTree table engine, Data skipping indexes - https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Docs: system.data_skipping_indices - https://clickhouse.com/docs/operations/system-tables/data_skipping_indices
- ClickHouse Docs: Full-text Search with Text Indexes - https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes

## Issues Found
- Corrected `bloom_filter()` parameter documentation. The default false-positive rate is `0.025`, not approximately `0.01`, and the optional parameter is documented as a rate between `0` and `1`, not only `0.001` to `0.1`.
- Clarified Bloom filter guidance. ClickHouse documentation recommends these indexes for sparse lookup values and warns that high-cardinality columns with no correlation to data ordering may not benefit.
- Updated `tokenbf_v1` and `ngrambf_v1` descriptions to note that they are deprecated for full-text search in ClickHouse 26.2 and newer in favor of `text` indexes.
- Corrected `tokenbf_v1` and `ngrambf_v1` parameter units from bits to bytes for the Bloom filter size.
- Corrected the tokenization example to preserve case and updated the `hasToken` example accordingly, since token matching is case-sensitive unless a lowercasing expression or case-insensitive function is used.
- Fixed the "Add Indexes After Testing" workflow. `ALTER TABLE ... ADD INDEX` only affects new data parts, so the example now materializes the index before waiting on `system.mutations` and retesting existing data.
- Reworded the benchmark comment from "force skip" to "skip indexes disabled" for `SETTINGS use_skip_indexes = 0`.

## Review Notes
The SQL examples and system table queries are otherwise consistent with current ClickHouse documentation. The post still focuses on Bloom-filter-based text skip indexes; for future modernization, consider adding a separate `text` index example because ClickHouse now recommends it for full-text search workloads.
