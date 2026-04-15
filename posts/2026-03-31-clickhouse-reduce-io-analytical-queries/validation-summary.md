# Validation Summary: How to Reduce IO in ClickHouse Analytical Queries

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (columnar database)
- ClickHouse MergeTree engine
- ClickHouse projections
- ClickHouse PREWHERE optimization
- ClickHouse compression codecs (Delta, Gorilla, ZSTD)
- ClickHouse SAMPLE clause
- ClickHouse system.query_log

## Sources Consulted
- ClickHouse ALTER TABLE ADD PROJECTION documentation: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse projections blog post: https://clickhouse.com/blog/clickhouse-faster-queries-with-projections-and-primary-indexes
- ClickHouse compression codecs documentation: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse compression modes documentation: https://clickhouse.com/docs/data-compression/compression-modes
- ClickHouse PREWHERE documentation: https://clickhouse.com/docs/optimize/prewhere
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse GROUP BY documentation: https://clickhouse.com/docs/sql-reference/statements/select/group-by

## Issues Found
1. **Projection syntax included incorrect `FROM` clause**: The `ALTER TABLE ADD PROJECTION` example contained `FROM events` inside the projection's SELECT statement. Projection definitions implicitly reference the parent table and do not accept a `FROM` clause. Removed `FROM events` from the projection definition. Also changed `GROUP BY project_id, hour` to `GROUP BY project_id, toStartOfHour(ts)` to use the full expression rather than the alias, consistent with official documentation examples for projections.

## Review Notes
- The SAMPLE clause example is syntactically correct, but SAMPLE only works on MergeTree tables that were created with a `SAMPLE BY` expression defining a sampling key. The blog does not mention this prerequisite. This is not an error per se (the post demonstrates the syntax correctly), but readers should be aware that the `events` table would need a sampling key for this to work.
- The partition pruning example assumes the `events` table is partitioned by a time-based expression on `ts` (e.g., `PARTITION BY toYYYYMM(ts)`). This is a reasonable assumption but is not stated explicitly.
- All codec usages are correct: Delta on DateTime (UInt32 internally), Gorilla on Float64, and ZSTD(3) (valid range 1-22) are all well-supported combinations.
- The PREWHERE behavior description is accurate. ClickHouse also automatically moves suitable WHERE conditions to PREWHERE via `optimize_move_to_prewhere` (enabled by default), so explicit PREWHERE is mainly useful for forcing a specific evaluation order.
