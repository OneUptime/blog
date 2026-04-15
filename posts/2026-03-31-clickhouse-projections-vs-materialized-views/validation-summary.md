# Validation Summary: How to Compare Projections vs Materialized Views in ClickHouse

## Status
validated

## Post Type
Guide / Comparison Reference

## Technologies Covered
- ClickHouse
- ClickHouse Projections
- ClickHouse Materialized Views
- SummingMergeTree engine
- MergeTree engine family

## Sources Consulted
- ClickHouse official docs — ALTER TABLE / Projection: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse official docs — CREATE VIEW (Materialized Views): https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse official docs — Cascading Materialized Views: https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views
- ClickHouse official docs — SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree

## Issues Found

1. **MV update mechanism described as "eventual"** — The comparison table stated materialized views are "Triggered by INSERT (eventual)." This is incorrect. ClickHouse materialized views are synchronous insert triggers: when data is inserted into the source table, the MV SELECT runs as part of the same INSERT pipeline, and if the MV write fails, the entire INSERT fails. Changed to "Triggered synchronously by INSERT."

2. **MV consistency claim "May lag during high insert load"** — Since MVs fire synchronously, they do not lag behind the source table. The actual consistency limitation is that MVs only process newly inserted data; data that existed in the source table before the MV was created is not backfilled. Changed to "Consistent for new inserts; pre-existing data not backfilled."

3. **`SummingMergeTree()` called with no column list** — The MV example used `ENGINE = SummingMergeTree()` without specifying which columns to sum. SummingMergeTree with no arguments sums ALL numeric columns during background merges, which would incorrectly sum `user_id` if it is numeric. Changed to `SummingMergeTree(events)` to explicitly sum only the `events` counter column.

4. **ORDER BY referenced `toStartOfDay(event_time)` instead of the alias `day`** — The MV's implicit target table derives its columns from the SELECT statement, where the column is aliased as `day`. The ORDER BY clause should reference `day`, not the original expression `toStartOfDay(event_time)` which would reference a column name that doesn't exist in the target table. Changed to `ORDER BY (user_id, day)`.

## Review Notes
- JOINs in standard (insert-triggered) materialized views are a common ClickHouse pattern but are not explicitly documented as supported for standard MVs (only confirmed for refreshable MVs in official docs). They work in practice but have a known caveat: the joined table is read at INSERT time, so if the right-side table doesn't yet have matching rows, those events silently produce no output. The blog's example is reasonable for illustration but users should be aware of this limitation.
- The claim that projections are "always consistent with base" is accurate for modern ClickHouse (v24.8+), but earlier versions had known issues where projection parts could get out of sync. The `deduplicate_merge_projection_mode` setting (introduced in v24.8) controls this behavior.
- The claim that projections inherit TTL from the base table and are removed on DROP TABLE is architecturally sound (projections live within the base table's part directories) but not explicitly documented.
