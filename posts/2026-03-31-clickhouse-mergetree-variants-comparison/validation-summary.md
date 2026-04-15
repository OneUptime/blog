# Validation Summary: ClickHouse MergeTree Variants Feature Comparison

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- ClickHouse MergeTree table engine family
- ReplacingMergeTree
- SummingMergeTree
- AggregatingMergeTree
- CollapsingMergeTree
- VersionedCollapsingMergeTree
- ClickHouse AggregateFunction column type

## Sources Consulted
- ClickHouse official documentation: MergeTree engine family (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family)
- ClickHouse official documentation: ReplacingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree)
- ClickHouse official documentation: SummingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree)
- ClickHouse official documentation: AggregatingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree)
- ClickHouse official documentation: CollapsingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree)
- ClickHouse official documentation: VersionedCollapsingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree)

## Issues Found
- **SummingMergeTree non-numeric column behavior**: The post stated "Non-numeric columns use the first value seen." According to ClickHouse documentation, for non-key, non-numeric columns, an arbitrary value is selected from the merged rows — not necessarily the first. Changed to: "Non-numeric, non-key columns retain an arbitrary value from the merged rows."

## Review Notes
- All SQL `CREATE TABLE` statements use correct syntax and valid column types for their respective engines.
- The `AggregateFunction(count)` and `AggregateFunction(sum, Decimal(12,2))` column type declarations are correct.
- The `VersionedCollapsingMergeTree(sign, version)` parameter order is correct per the documentation.
- The feature comparison table uses the term "Deduplication" loosely to mean "row reduction during merges." This is acceptable for a high-level comparison but readers should understand that SummingMergeTree and AggregatingMergeTree perform aggregation, not deduplication in the strict sense.
- The post correctly notes that `FINAL` is needed for consistent reads with ReplacingMergeTree. The same caveat applies to all merge-time engines (SummingMergeTree, AggregatingMergeTree, etc.) — merges are asynchronous, so queries without `FINAL` may see unmerged rows. The post only mentions this for ReplacingMergeTree, which is fine for a comparison overview but worth noting.
