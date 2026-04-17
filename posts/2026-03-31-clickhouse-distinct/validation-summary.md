# Validation Summary: How to Use DISTINCT in ClickHouse Efficiently

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- `SELECT DISTINCT`
- `GROUP BY`
- Aggregate functions: `uniq()`, `uniqExact()`, `count(DISTINCT ...)`
- Date functions: `toDate()`, `today()`
- `EXPLAIN`

## Sources Consulted
- ClickHouse official docs: SELECT DISTINCT — https://clickhouse.com/docs/en/sql-reference/statements/select/distinct
- ClickHouse official docs: GROUP BY — https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse official docs: uniq — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official docs: uniqExact — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse official docs: Date/Time functions (toDate, today) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official docs: EXPLAIN — https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
- **Misleading phrase in the introduction**: The intro described `DISTINCT` as requiring a "distributed deduplication step". In ClickHouse terminology, "Distributed" refers specifically to the Distributed table engine, so this phrasing is misleading on single-shard/MergeTree tables where DISTINCT simply performs a full deduplication (not necessarily distributed). Changed to "full deduplication step" to accurately describe the cost regardless of table engine.

## Review Notes
- `uniq()` is backed by an adaptive HyperLogLog-style algorithm with a typical relative error of ~0.5%; "slightly imprecise" in the post is a reasonable informal characterization.
- The claim that `GROUP BY` is "often faster" than `DISTINCT` for multi-column deduplication is a reasonable general rule of thumb, though edge cases exist (e.g., `DISTINCT` combined with `LIMIT` can short-circuit early). Not a technical error, just worth noting for advanced readers.
- The "spill to disk" remark under Performance Considerations is correct when `max_bytes_before_external_distinct` (and analogous group-by/sort settings) is configured; this is off by default, so readers should be aware the default behavior is in-memory only.
- All code samples are syntactically valid ClickHouse SQL and use current, non-deprecated functions.
