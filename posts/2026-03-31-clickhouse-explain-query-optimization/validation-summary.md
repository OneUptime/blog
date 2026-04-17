# Validation Summary: How to Use EXPLAIN for Query Optimization in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (EXPLAIN statement, MergeTree engine, system.query_log)
- SQL

## Sources Consulted
- ClickHouse official docs — EXPLAIN Statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official docs — Query Optimization guide: https://clickhouse.com/docs/en/optimize/query-optimization
- ClickHouse official docs — PREWHERE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse official docs — system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **"Five EXPLAIN modes" claim was inaccurate.** ClickHouse actually supports seven EXPLAIN types (AST, SYNTAX, QUERY TREE, PLAN, PIPELINE, ESTIMATE, TABLE OVERRIDE). The table also listed `EXPLAIN indexes = 1` as a separate mode when it is actually a *setting* applied to the default `EXPLAIN PLAN`. Updated the introductory sentence to say "several `EXPLAIN` types along with settings", expanded the table to include `QUERY TREE` and `ESTIMATE`, clarified that `EXPLAIN` is an alias for `EXPLAIN PLAN`, and labelled the `indexes = 1` row as a setting rather than a distinct mode.

2. **First EXPLAIN example's sample output incorrectly included the `Indexes:` block.** Per the ClickHouse docs, the default `EXPLAIN` output does not display the `Indexes:` block — the `indexes = 1` setting is required to see Parts/Granules statistics. The sample output was showing fields that would not appear for the plain `EXPLAIN` command shown above it. Removed the `Indexes:` block from the sample output and revised the "Key things to look for" bullets to describe the logical plan steps that ARE visible in default EXPLAIN, with a forward reference to `EXPLAIN indexes = 1` for the index-reduction statistics. The Parts/Granules discussion is preserved in the next section where `indexes = 1` is shown.

## Review Notes

- **EXPLAIN SYNTAX and PREWHERE**: The post's claim that `EXPLAIN SYNTAX` shows automatic `PREWHERE` moves is historically accurate for older ClickHouse versions, where the `MergeTreeWhereOptimizer` pass rewrote the query textually. With the newer analyzer (enabled by default in recent releases), PREWHERE relocation is sometimes better observed via `EXPLAIN PLAN`, `EXPLAIN QUERY TREE`, or debug logging (`set send_logs_level = 'debug'`). The post's approach still works in many common configurations, so this was left as-is, but readers on very recent ClickHouse versions may want to fall back to debug logging if `EXPLAIN SYNTAX` does not show the move.
- **MergedRows ProfileEvent**: Used in the `system.query_log` example. It is a valid ProfileEvent, but it is primarily populated for background merges and aggregation merge steps — for many simple SELECTs it may read as 0. Left as-is since it is technically valid.
- **EXPLAIN PIPELINE output**: The `Resize 1 -> 1` line is unusual but plausible depending on ClickHouse version and query shape. The `MergeTreeInOrder` processor is a real processor, though you can also see `MergeTreeThread` for other query shapes. These are version-dependent details and were left unchanged.
- **Timestamps in EXPLAIN output**: The Unix timestamps used in the sample output (1725148800 for 2024-09-01 UTC, 1727740800 for 2024-10-01 UTC) are accurate.
- **Skipping index example**: The `bloom_filter(0.01)` and `MATERIALIZE INDEX` syntax is correct.
