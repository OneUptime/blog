# Validation Summary: How to Use SAMPLE Clause for Query Performance in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, SAMPLE clause)
- SQL (DDL, SELECT, JOIN, GROUP BY)
- Approximate query processing / data sampling

## Sources Consulted
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse MergeTree engine documentation (SAMPLE BY section): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse hash functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions

## Issues Found

1. **SAMPLE BY expression missing hash function (DDL example)**: The original DDL used `SAMPLE BY user_id` directly. ClickHouse documentation recommends using a hash function (e.g., `intHash32(UserID)`) to ensure uniform distribution across the sampling range. Raw sequential user IDs would result in non-uniform sampling (contiguous ranges selected rather than a representative subset). Fixed to `SAMPLE BY intHash32(user_id)` with matching `ORDER BY (intHash32(user_id), event_time)`.

2. **Inaccurate prerequisite description**: The original text stated "The sampling key must be part of or come after the ORDER BY key." This was vague. The actual requirement from ClickHouse docs is that the sampling expression must be contained in the primary key (which defaults to ORDER BY). Updated to clarify and mention the hash function recommendation.

3. **JOIN example: misleading comment and missing SAMPLE on second table**: The SQL comment stated "Both tables sample the same 10% of users" but only `user_events` had `SAMPLE 0.1` applied; `user_profiles` was fully scanned. Added `SAMPLE 0.1` to `user_profiles` in the JOIN and updated comments to note that both tables must define `SAMPLE BY` with a compatible expression.

4. **Adaptive sampling query: logical error**: The original query used `SAMPLE 0.01` unconditionally but conditionally scaled the count based on a full-table-scan subquery (`SELECT count() FROM user_events`). This had two problems: (a) the subquery itself does a full scan, defeating the performance purpose; (b) for small tables (< 100M rows), the SAMPLE is still applied but the count is not scaled, returning ~1% of the actual count. Replaced with a correct fixed-sample query using `_sample_factor` for automatic scaling, and deferred true adaptive behavior to the application-layer parameterized query that follows.

## Review Notes
- The error margin table (Sample Fraction vs. Typical Error) provides reasonable rules of thumb but actual error depends heavily on data distribution and the specific aggregate function. These are approximations, not guarantees.
- The cardinality estimation section (`uniq(user_id) * 10` for a 10% sample) works correctly in this specific case because `user_id` is the sampling key — all rows for a given user are either in or out of the sample. This linear scaling would NOT be valid for counting distinct values of columns other than the sampling key.
- The `SAMPLE 1000000` (absolute row count) syntax is correctly documented. The post could note that `_sample_factor` is especially important with this form since the exact fraction is not known at query time.
- ClickHouse official examples use `intHash32` rather than `intHash64` for SAMPLE BY expressions; this review followed that convention.
