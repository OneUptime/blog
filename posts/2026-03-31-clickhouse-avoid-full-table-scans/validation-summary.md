# Validation Summary: How to Avoid Full Table Scans in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (ClickHouse SQL dialect)
- ClickHouse sparse primary index
- ClickHouse partitioning
- ClickHouse skip/data-skipping indexes (`set`, `tokenbf_v1`)
- ClickHouse `EXPLAIN indexes = 1`

## Sources Consulted
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — Data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse docs — EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse docs — Primary keys and index granularity: https://clickhouse.com/docs/en/guides/improving-query-performance/sparse-primary-indexes
- ClickHouse docs — Partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
- **`set(N)` described as a bloom filter.** The post previously said: *"The `set(100)` bloom stores up to 100 unique values per granule group."* In ClickHouse, `set(max_rows)` is a distinct skip index type that stores unique values of the expression — it is not a bloom filter (bloom filters are separate types: `bloom_filter`, `tokenbf_v1`, `ngrambf_v1`). Changed wording to `"The set(100) index stores up to 100 unique values per granule group."` to be technically accurate.

## Review Notes
- The default `index_granularity` of 8192 rows is correct.
- `EXPLAIN indexes = 1` syntax and the `Granules: N/N` output format are accurate.
- `PARTITION BY toYYYYMM(event_time)` is a standard, correct partitioning pattern.
- `tokenbf_v1(32768, 3, 0)` parameters (filter size in bytes, number of hash functions, random seed) are correctly described by their usage.
- The advice to avoid wrapping primary-key columns in functions is generally correct best practice. Note: ClickHouse has some support for monotonic function chains on primary keys (e.g., `toDate(event_time)` can sometimes still use the index because `toDate` is monotonic), but using raw range filters remains the most reliable approach and is the safer recommendation to give readers.
- `ALTER TABLE ... ADD INDEX ...` followed by `MATERIALIZE INDEX` is the correct two-step procedure to backfill an index on existing data.
