# Validation Summary: How to Create Tables with Multiple Indexes in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree family engines)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- ClickHouse primary key / ORDER BY semantics
- ClickHouse data skipping indexes: `minmax`, `set`, `bloom_filter`, `tokenbf_v1`, `ngrambf_v1`
- ClickHouse EXPLAIN for index usage

## Sources Consulted
- ClickHouse official docs — MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — Data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse official docs — CREATE TABLE indexes syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse official docs — ALTER TABLE MATERIALIZE INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse official docs — EXPLAIN: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official docs — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found
No technical issues found.

Key points verified:
- `ORDER BY` defaults to the primary key; `PRIMARY KEY` may be a prefix of `ORDER BY` — correct.
- Default `index_granularity = 8192` — correct.
- `INDEX name expr TYPE type(params) GRANULARITY n` syntax — correct.
- `set(N)` with `N=0` meaning unlimited unique values per granule — correct.
- `bloom_filter(0.01)` using a false-positive rate parameter — correct (parameter is optional, default 0.025).
- `tokenbf_v1(size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)` parameter order — correct.
- `ngrambf_v1(n, size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)` parameter order — correct.
- `ALTER TABLE ... ADD INDEX` / `MATERIALIZE INDEX` / `DROP INDEX` syntax — correct.
- `EXPLAIN indexes = 1` — correct syntax for surfacing index usage.

## Review Notes
- `tokenbf_v1` and `ngrambf_v1` remain supported, but modern ClickHouse also offers a newer experimental full-text index (`INDEX ... TYPE text`) and inverted indexes. A future revision could mention these for completeness, though it is not required for correctness.
- The `idx_user_id` minmax index in the complete example is defined on `user_id`, which is already part of the `ORDER BY (created_at, user_id)` tuple. A minmax skipping index on a trailing ORDER BY column can still help when filtering by `user_id` alone, but it's worth being aware it overlaps with primary-key range analysis. This is a design nuance, not a correctness issue.
- The advice that `minmax` is best when the indexed column is "weakly correlated with ORDER BY" is a good rule of thumb; strict uncorrelated columns benefit less — ClickHouse docs phrase it as "the column's values in adjacent data parts have a low correlation with ORDER BY," which aligns with the post's wording.
