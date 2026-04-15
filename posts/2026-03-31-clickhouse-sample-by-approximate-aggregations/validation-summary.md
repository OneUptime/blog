# Validation Summary: How to Use SAMPLE BY for Approximate Aggregations in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SAMPLE BY clause and SAMPLE query syntax
- `_sample_factor` virtual column
- SummingMergeTree engine
- Materialized views

## Sources Consulted
- ClickHouse official documentation on SAMPLE BY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse official documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse official documentation on `_sample_factor` virtual column: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#virtual-columns
- ClickHouse official documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree

## Issues Found

### 1. Materialized view with SAMPLE clause (Critical)
**What was wrong:** The "Combining Sampling with Materialized Views" section used `SAMPLE 0.1` in the materialized view's inner SELECT. The `SAMPLE` clause is a query-time feature that reads a deterministic fraction of an existing table's data using the SAMPLE BY index. Materialized views process INSERT blocks as they arrive, not the full table, so `SAMPLE` has no valid table to sample from in this context. The query would either fail or produce undefined behavior.

**What was changed:** Replaced the `SAMPLE 0.1` approach with a hash-based `WHERE cityHash64(event_id) % 10 = 0` filter, which deterministically selects ~10% of incoming rows at insert time. Added an explanatory note about why SAMPLE cannot be used in MVs and a note to multiply by 10 when querying the view.

### 2. Approximate COUNT DISTINCT missing caveat (Moderate)
**What was wrong:** The `uniq(user_id) * _sample_factor` pattern was presented without qualification. This only produces accurate estimates when the `SAMPLE BY` key is based on the same column being counted for uniqueness (e.g., `SAMPLE BY intHash32(user_id)`). When the SAMPLE BY key is based on a different column, rows from the same user can be split across sample and non-sample partitions, causing the scaled unique count to significantly overestimate the true cardinality.

**What was changed:** Added a note explaining that this pattern works well when the SAMPLE BY key is based on the same column, and recommending `uniq()` on the full dataset as an alternative when it is not.

## Review Notes
- The `min()` and `max()` functions are correctly listed as not needing scaling (you should not multiply them by `_sample_factor`), but users should be aware that sampling may miss true extreme values. The sampled min/max are not guaranteed to match the full-dataset min/max.
- The speedup estimates in the table (e.g., 8-10x for 10% sample) are reasonable theoretical approximations. Real-world speedups depend on I/O patterns, data granularity, and cache behavior.
- The claim of "error rates under 1% when the sampled row count exceeds 10,000" in the summary is a reasonable rule of thumb for additive aggregates over well-behaved distributions, though actual error depends on data variance and distribution.
- All SQL syntax (`SAMPLE 0.1`, `_sample_factor`, `count()`, `sum()`, `uniq()`, `avg()`, `toDate()`, `today()`, `GROUP BY`, `ORDER BY`) is valid ClickHouse SQL.
