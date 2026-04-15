# Validation Summary: How to Use ngrambf_v1 Skip Index in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, skip indexes)
- ngrambf_v1 bloom filter index
- SQL (DDL, DML, EXPLAIN)

## Sources Consulted
- ClickHouse official documentation on Data Skipping Indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse official documentation on ngrambf_v1: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#available-types-of-indices
- ClickHouse official documentation on EXPLAIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **Misleading `hasToken` reference**: The introductory description stated that `ngrambf_v1` dramatically speeds up `LIKE` and `hasToken` queries. While ClickHouse does list `hasToken` as a supported expression for `ngrambf_v1`, this is misleading because `hasToken` is a token-based function best served by the `tokenbf_v1` index type, which is specifically designed for token searches. Highlighting `hasToken` here could lead readers to choose `ngrambf_v1` over the more appropriate `tokenbf_v1` for token-based queries. Changed to list `LIKE`, `notLike`, and `multiSearchAny` as the primary accelerated query types, which are the true strengths of n-gram bloom filters.

## Review Notes
- The `ngrambf_v1` parameter signature `(n, size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)` is correct per official docs.
- The bloom filter size parameter (65536) is correctly described as bytes.
- The CREATE TABLE syntax with inline INDEX definition is correct for MergeTree tables.
- The EXPLAIN indexes = 1 syntax is correct for verifying skip index usage.
- The MATERIALIZED column pattern for case-insensitive search is a valid and recommended approach.
- The guidance on n-gram size selection (n=3 for short substrings, n=4 as a general default, n=5+ for longer patterns) is practical and accurate.
- The post correctly notes that n-gram bloom filters are case-sensitive by default, which is an important detail users often miss.
