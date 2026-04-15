# Validation Summary: How to Read ClickHouse Query Execution Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, query execution plans)
- SQL (EXPLAIN, EXPLAIN PIPELINE, EXPLAIN SYNTAX)
- ClickHouse skipping indexes (minmax, bloom_filter)
- ClickHouse primary key index and granule pruning

## Sources Consulted
- ClickHouse EXPLAIN documentation — https://clickhouse.com/docs/en/sql-reference/statements/explain
- Altinity Knowledge Base: EXPLAIN query — https://kb.altinity.com/altinity-kb-queries-and-syntax/explain-query/
- ChistaDATA Comprehensive Guide to ClickHouse EXPLAIN — https://chistadata.com/comprehensive-guide-clickhouse-explain/
- ClickHouse skipping indexes documentation — https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse Top-N query optimization blog post — https://clickhouse.com/blog/clickhouse-top-n-queries-granule-level-data-skipping

## Issues Found

1. **First example missing `indexes = 1` flag**: The first `EXPLAIN` query used plain `EXPLAIN` without `indexes = 1`, but the example output showed index information (Parts, Granules, PrimaryKey). ClickHouse only displays index details when `indexes = 1` is specified. Fixed by changing `EXPLAIN` to `EXPLAIN indexes = 1`.

2. **Incorrect "preliminary LIMIT" explanation**: The post claimed "ClickHouse applied the limit before the final sort, reducing the data that must be sorted." In the plan tree shown, `Limit` is the parent of `Sorting`, meaning data flows through Sorting first, then Limit. The actual optimization is that ClickHouse passes the limit information to the sorting step, enabling a partial sort (top-N) algorithm. Fixed to accurately describe the limit as applied before the final projection, with the sorting step using the limit for a top-N optimization.

3. **Minmax index skip condition off by one**: The post said granules are skipped "where the maximum value across all rows is less than 100" for the condition `value > 100`. The correct threshold is "100 or less" (`<= 100`), since a granule where max equals exactly 100 also cannot contain any rows satisfying `value > 100`. Also clarified that minmax indexes operate on groups of granules (per the GRANULARITY setting), not individual granules. Fixed to "100 or less" and "group of granules."

## Review Notes
- The example plan outputs are illustrative rather than captured from a real ClickHouse instance, which is reasonable for a tutorial. The structure and labels are representative of actual ClickHouse EXPLAIN output.
- The granule math is correct: 203 granules × 8192 rows/granule ≈ 1.66M rows, and 9216 × 8192 ≈ 75M rows.
- The Unix timestamps in the examples (1725148800 = 2024-09-01, 1727740800 = 2024-10-01) are correct.
- The `bloom_filter(0.01) GRANULARITY 1` and `MATERIALIZE INDEX` syntax is correct.
- The EXPLAIN PIPELINE output with transform names (MergeTreeThread, FilterTransform, AggregatingTransform, etc.) accurately represents ClickHouse pipeline internals.
- The `max_bytes_before_external_sort` setting and `system.query_log.memory_usage` references are valid.
