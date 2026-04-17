# Validation Summary: How to Design Compound Primary Keys in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Primary key / ORDER BY / sparse index
- Granules and `index_granularity`
- `EXPLAIN indexes=1`

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse sparse primary indexes guide: https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes
- ClickHouse EXPLAIN reference: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse operators reference (INTERVAL syntax): https://clickhouse.com/docs/sql-reference/operators

## Issues Found
No technical issues found.

All claims were verified against the official ClickHouse documentation:
- Sparse primary key index with one mark per granule — correct.
- Default `index_granularity` is 8192 rows — correct.
- Binary search over the sparse index for granule pruning — correct.
- `EXPLAIN indexes=1` output contains `Granules: X/Y` showing granules after/before index application — correct.
- Primary key index only prunes on a leading prefix of the ORDER BY tuple; filtering on a non-leading column alone yields no primary-key pruning — correct.
- `now() - INTERVAL 1 HOUR`, `ENGINE = MergeTree() ORDER BY (...)` — valid, current, non-deprecated syntax.

## Review Notes
- The post is accurate and focused. A future revision could optionally mention data-skipping indexes (`INDEX ... TYPE minmax/set/bloom_filter`) and `PROJECTION`s as complementary tools when queries do not match a primary-key prefix, since the current post only notes "no index benefit" in that case. Not an error — just an optional enhancement.
- Mentioning that `PRIMARY KEY` can be declared separately from `ORDER BY` (and must be a prefix of it) could also be useful context, but is out of scope for what the post is trying to teach.
