# Validation Summary: How to Implement Exactly-Once Delivery into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplacingMergeTree, ReplicatedMergeTree, MergeTree, Materialized Views)
- SQL / ClickHouse DDL
- Insert deduplication (`insert_deduplication_token`, `replicated_deduplication_window`, `non_replicated_deduplication_window`)

## Sources Consulted
- ClickHouse official docs — ReplacingMergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official docs — Data replication / ReplicatedMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse official docs — MergeTree settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse official docs — `insert_deduplication_token` setting
- ClickHouse official docs — Materialized Views

## Issues Found

1. **Strategy 1 — "primary key" terminology**
   The post stated that `ReplacingMergeTree` deduplicates by "primary key". Per ClickHouse docs, dedup is based on the sorting key (`ORDER BY` clause), not the primary key. Changed wording to "sorting key (the `ORDER BY` columns)".

2. **Strategy 2 — incomplete claim about native block dedup**
   The post implied `replicated_deduplication_window` governs automatic block dedup in general. In reality this setting only applies to `ReplicatedMergeTree`. For non-replicated `MergeTree`, native dedup is disabled by default and controlled by `non_replicated_deduplication_window` (defaults to `0`). Rewrote the sentence to call out both tables and both settings.

3. **Strategy 3 — heading/code mismatch and non-functional dedup pattern**
   Heading said "AggregatingMergeTree" but the code used `MergeTree()`. Also, the materialized view aggregated with `any()`/`min()` into an undefined `events_deduped` table; plain aggregation in an MV does not deduplicate across insert batches unless the destination is a collapsing/aggregating engine. Rewrote the section:
   - Retitled to "Using a Staging Table with a Materialized View".
   - Added an explicit `events_deduped` table definition using `ReplacingMergeTree(created_at)` keyed by `event_id`, which actually delivers the dedup behavior the section claims.
   - Simplified the MV to a straight `SELECT` feeding the dedup engine.

4. **Strategy 4 — invalid `SET` statement for a MergeTree setting**
   The post used `SET replicated_deduplication_window = 100;` which is invalid. `replicated_deduplication_window` is a table-level MergeTree setting, not a session-level user setting. Replaced with `ALTER TABLE events MODIFY SETTING replicated_deduplication_window = 100;` and added a one-line explanation that it can alternatively be set at `CREATE TABLE` time or in `config.xml` under the `<merge_tree>` section. Also updated the language tag from `bash` to `sql` (implicitly, by removing the shell comment).

## Review Notes
- The post discusses "exactly-once" delivery broadly. Strictly speaking, ClickHouse's mechanisms provide effectively-once semantics through idempotent inserts plus eventual dedup during merges — there is a window where duplicates exist on disk until merges run (especially for `ReplacingMergeTree`). The post's use of `FINAL` at query time is correct as a read-time workaround but has a performance cost that could be worth calling out for readers.
- The `insert_deduplication_token` default dedup window is limited; users inserting with tokens across long time spans should be aware of the `(non_)replicated_deduplication_window` bound.
- ReplacingMergeTree's newer `is_deleted` column / 2-argument form was not discussed, which is acceptable for an introductory guide but worth mentioning in a future revision.
- The `{shard}` / `{replica}` macros in the `ReplicatedMergeTree` path assume those macros are configured in the ClickHouse server config — a prerequisite that readers deploying on a single node may miss.
