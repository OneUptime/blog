# Validation Summary: How to Choose the Right MergeTree Variant in ClickHouse

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- ClickHouse
- MergeTree engine family (MergeTree, ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree, CollapsingMergeTree, VersionedCollapsingMergeTree, GraphiteMergeTree)
- Materialized Views / AggregateFunction column types
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official docs - MergeTree family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family
- ClickHouse docs - ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse docs - SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse docs - AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs - CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse docs - VersionedCollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse docs - GraphiteMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/graphitemergetree

## Issues Found
No technical issues found.

All engine names, constructor parameters, and semantics match the official ClickHouse documentation:
- `MergeTree` takes no parameters; uses `PARTITION BY` / `ORDER BY` clauses - correct.
- `ReplacingMergeTree([ver])` accepts an optional version column - correct.
- `FINAL` modifier for read-time deduplication - correct.
- `SummingMergeTree([columns])` accepts an optional tuple of numeric columns to sum - correct.
- `AggregatingMergeTree()` takes no parameters - correct.
- `CollapsingMergeTree(sign)` with `sign=1` for state and `sign=-1` for cancellation - correct.
- `VersionedCollapsingMergeTree(sign, version)` for out-of-order collapse - correct.
- `GraphiteMergeTree('config_section')` referencing a rollup config - correct.

## Review Notes
- ReplacingMergeTree in ClickHouse 23.2+ also supports an optional `is_deleted` column as a second parameter (`ReplacingMergeTree(ver, is_deleted)`). The post's simpler `(version)` form remains valid and is the most common usage, so no change needed.
- The post correctly notes that `FINAL` forces deduplication at read time but does not discuss its performance cost or the alternative `OPTIMIZE TABLE ... FINAL` - out of scope for this overview.
- SummingMergeTree's column argument is optional; if omitted, all non-key numeric columns are summed. The example explicitly lists columns, which is good practice.
- AggregatingMergeTree example is minimal; readers will need a materialized view with `-State` combinators to make it useful, which the post alludes to but doesn't show in full. Acceptable for an overview-style guide.
