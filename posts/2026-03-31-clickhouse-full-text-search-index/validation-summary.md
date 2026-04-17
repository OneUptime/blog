# Validation Summary: How to Use Full-Text Search Index in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Skip indexes: `ngrambf_v1` and `tokenbf_v1`
- ClickHouse SQL (LIKE, ILIKE, hasToken, startsWith, EXPLAIN indexes, ALTER TABLE ... MATERIALIZE INDEX)

## Sources Consulted
- ClickHouse docs — MergeTree skip index types (`ngrambf_v1`, `tokenbf_v1`): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — String search functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse docs — EXPLAIN statement (indexes = 1): https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **`hasSubstr` is not a ClickHouse string function.** The post listed `hasSubstr(col, 'substring')` as enabled by `ngrambf_v1` and included a query example using it. `hasSubstr` exists only as an array function, not as a string-search function, and it is not in the list of functions optimized by `ngrambf_v1` or `tokenbf_v1`. Replaced the bullet point with `startsWith` / `endsWith` and `match`, which are actually supported by `ngrambf_v1`, and replaced the `hasSubstr` query example with a `startsWith` example.

## Review Notes
- `ngrambf_v1` syntax `(n, size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)` and `tokenbf_v1` syntax `(size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)` are correct, including that the bloom-filter size parameter is in bytes.
- The `EXPLAIN indexes = 1` output format shown is a reasonable plaintext representation; the actual output in some ClickHouse versions is JSON-like and uses `Granules: 2/6` notation (after/before), but the example in the post conveys the right information.
- `tokenbf_v1` splits on non-alphanumeric characters (not strictly whitespace); the post's phrasing "whitespace-delimited tokens" is an acceptable simplification for readers but slightly imprecise. Left as-is since it does not affect correctness of the examples.
- The post correctly notes that `hasToken` works with `tokenbf_v1` and that `LIKE '%...%'` is accelerated by `ngrambf_v1`; combining both indexes on one column so the planner picks the best one is also accurate.
