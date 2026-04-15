# Validation Summary: How to Use PREWHERE for Performance Optimization in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, PREWHERE clause, skip indexes)
- SQL (ClickHouse dialect)
- Bloom filter skip indexes
- system.query_log for performance analysis

## Sources Consulted
- ClickHouse PREWHERE documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse PREWHERE optimization guide: https://clickhouse.com/docs/optimize/prewhere
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse MergeTree documentation (skip indexes): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **Incorrect comment about column reads without PREWHERE (line 31):** The comment said "reads all columns (user_id, page_url, referrer, session_data) for all rows," implying ClickHouse reads every column in the table. ClickHouse is a columnar database and only reads columns referenced in the query. Fixed to: "reads user_id and page_url for all rows in matching granules."

2. **Incorrect comment in two-stage filtering example (line 101):** The comment said "Stage 1: PREWHERE reads only 'partition_date' (4 bytes) and 'error_code' (2 bytes)" but `partition_date` is in the `WHERE` clause, not `PREWHERE`. Only `error_code` is read during the PREWHERE stage. Fixed to: "Stage 1: PREWHERE reads only 'error_code' (2 bytes)."

3. **Overstated restriction on non-deterministic functions (line 184):** The post claimed "PREWHERE expressions cannot use non-deterministic functions." The official ClickHouse documentation does not list this as a hard restriction. The automatic `optimize_move_to_prewhere` heuristic excludes non-deterministic functions, but explicit PREWHERE can use them. Fixed to clarify the distinction between automatic optimization behavior and explicit usage.

## Review Notes
- The explanation that PREWHERE "reads 1,000 rows' worth of page_url instead of 1 billion rows' worth" is a simplification. PREWHERE operates at the granule level (default 8192 rows), so if matching rows are spread across many granules, more data is read than just the matching rows. However, this is an acceptable simplification for an introductory tutorial.
- All SQL syntax (PREWHERE, SETTINGS, CREATE TABLE with INDEX, EXPLAIN, system.query_log queries) verified correct against official ClickHouse documentation.
- The `bloom_filter(0.01)` false positive rate, `GRANULARITY 1`, and `formatReadableSize()` function are all valid.
- The `query_duration_ms`, `read_rows`, and `read_bytes` columns in `system.query_log` are confirmed to exist.
- The `optimize_move_to_prewhere` setting name and its default-enabled behavior are confirmed correct.
