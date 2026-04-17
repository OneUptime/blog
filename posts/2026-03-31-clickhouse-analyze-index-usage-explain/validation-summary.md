# Validation Summary: How to Analyze Index Usage with EXPLAIN in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse EXPLAIN (PLAN, PIPELINE, AST, SYNTAX, `indexes = 1`)
- MergeTree primary key index
- Data skipping indexes (minmax, set)
- ClickHouse partition pruning
- `system.query_log`

## Sources Consulted
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#data_skipping-indexes
- ClickHouse ALTER INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse partitioning / partition pruning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
1. **Non-standard EXPLAIN output phrasing.** The sample output and the patterns table showed `Condition: true (whole table)`. The `(whole table)` parenthetical is not present in actual ClickHouse EXPLAIN output — ClickHouse prints `Condition: true` when no primary key filter applies. Fixed both occurrences to just `Condition: true`.
2. **Misleading partition-pruning claim for `toYYYYMM(ts)`.** The original text implied that `WHERE toYYYYMM(ts) = 202401` cannot be used for partition pruning and that a direct range filter is always "better". In ClickHouse, if the table is partitioned by `toYYYYMM(ts)`, that filter prunes partitions correctly because the filter expression matches the partition key. The text was rewritten to clarify that pruning works when the filter aligns with the partition key, and a range-based filter is an alternative when it does not — instead of framing range filters as unconditionally better.

## Review Notes
- The post lists common EXPLAIN variants but omits `EXPLAIN ESTIMATE` and `EXPLAIN QUERY TREE` (new analyzer). This is not an error — the table is not presented as exhaustive — but these are worth adding in a future revision.
- `description = 1` is actually enabled by default in `EXPLAIN PLAN`; the post's framing as a setting to add is acceptable but slightly misleading. Not fixed because it's not technically wrong.
- Skip index DDL, `MATERIALIZE INDEX`, `system.query_log` columns, and the general structure of the `ReadFromMergeTree` EXPLAIN output are all accurate against current ClickHouse documentation.
