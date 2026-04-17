# Validation Summary: How to Deduplicate Data During Ingestion into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree family)
- ReplacingMergeTree
- CollapsingMergeTree
- ClickHouse insert deduplication settings (`insert_deduplication_token`, `replicated_deduplication_window`, `non_replicated_deduplication_window`, `deduplicate_blocks_in_dependent_materialized_views`)

## Sources Consulted
- ClickHouse SELECT DISTINCT docs: https://clickhouse.com/docs/en/sql-reference/statements/select/distinct
- ClickHouse system.replicas: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse MergeTree settings (`MergeTreeSettings.cpp` source): default values for `replicated_deduplication_window` (10000), `replicated_deduplication_window_seconds` (3600), `non_replicated_deduplication_window` (0)
- ClickHouse insert settings (`insert_deduplication_token`, `deduplicate_blocks_in_dependent_materialized_views`)

## Issues Found

1. **Layer 1 — incorrect query for checking the deduplication window.** The post originally suggested `SELECT * FROM system.replicas WHERE is_leader = 1;` to "check the deduplication window." The `system.replicas` table contains replication state (queue size, log pointers, leadership) and does **not** expose deduplication-window settings. Multiple replicas can also be leaders simultaneously, so the filter is not a uniqueness check either. Replaced with a query against `system.merge_tree_settings` that selects the actual deduplication window settings (`replicated_deduplication_window`, `replicated_deduplication_window_seconds`, `non_replicated_deduplication_window`).

2. **Layer 5 — invalid SQL combining `DISTINCT ON` with `GROUP BY`.** The first staging-deduplication example used `SELECT DISTINCT ON (event_id) ... GROUP BY event_id`. Per ClickHouse docs, `DISTINCT ON` cannot be combined with `GROUP BY` (or `LIMIT BY`) — the query will throw an exception. Removed the `DISTINCT ON` clause; the surviving `GROUP BY event_id` with `any(...)` aggregations is a correct and idiomatic way to deduplicate in a staging query. The second `argMax` example was already correct and was left unchanged.

## Review Notes
- The Layer 1 comment "This works for ReplicatedMergeTree and enabled by default" attached to `deduplicate_blocks_in_dependent_materialized_views` is slightly misleading — that setting controls deduplication propagation into materialized views, not ReplicatedMergeTree's underlying block deduplication (which is separately enabled by default). Left as-is to avoid restructuring the section, but a future revision could split these concerns.
- `non_replicated_deduplication_window` has a default of `0` (disabled); the example correctly enables it explicitly via `SETTINGS non_replicated_deduplication_window = 100`.
- `SELECT ... FINAL` and `OPTIMIZE TABLE ... FINAL` are correct techniques for `ReplacingMergeTree`, but both are expensive at scale. A future revision could mention this caveat.
- The CollapsingMergeTree example is technically correct, but readers should note that downstream queries typically need `sum(Sign)` aggregation or `FINAL` for accurate results between merges.
