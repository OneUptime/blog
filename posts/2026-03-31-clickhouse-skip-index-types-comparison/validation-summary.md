# Validation Summary: ClickHouse Skip Index Types Feature Comparison

## Status
validated

## Post Type
Reference / Feature Comparison

## Technologies Covered
- ClickHouse (MergeTree engine family)
- Data skipping indexes (minmax, set, bloom_filter, ngrambf_v1, tokenbf_v1)
- Bloom filters
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse official documentation on MergeTree data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse skipping indexes guide: https://clickhouse.com/docs/en/optimize/skipping-indexes
- ClickHouse EXPLAIN statement documentation

## Issues Found
No technical issues found.

All claims verified as accurate:
- Default granule size of 8192 rows is correct.
- ALTER TABLE ADD INDEX syntax is correct for all index types.
- minmax index: no parameters, stores min/max per granule — correct.
- set(N) index: N is max distinct values per granule — correct.
- bloom_filter(fp_rate): fp_rate is the false positive rate (default 0.025 if omitted) — correct.
- ngrambf_v1(n, bloom_size, hash_count, seed): 4 parameters, splits strings into n-grams — correct.
- tokenbf_v1(bloom_size, hash_count, seed): 3 parameters, tokenizes by non-alphanumeric characters — correct.
- Bloom filter description ("false positives but never false negatives") is mathematically accurate.
- hasToken() is the correct function for tokenbf_v1 queries.
- ngrambf_v1 correctly supports LIKE '%substr%' queries.
- EXPLAIN indexes = 1 is valid syntax (PLAN is the default EXPLAIN type).
- GRANULARITY values used in examples are reasonable.

## Review Notes
- The description of set(N) behavior states "Granules with more unique values are not indexed." This is a simplification — technically the index still exists for those granules but treats them as potentially matching all values, so they are never skipped. The simplification is reasonable for a comparison post but could be clarified in a future revision.
- The post does not mention that existing data requires `ALTER TABLE ... MATERIALIZE INDEX` after adding a skip index via ALTER TABLE. This is a practical consideration readers may encounter, but omitting it is acceptable for a feature comparison post.
- Both `ngrambf_v1` and `tokenbf_v1` may be deprecated in recent ClickHouse releases in favor of a newer `text` index type. This should be verified against the latest ClickHouse release notes and the post updated if confirmed.
