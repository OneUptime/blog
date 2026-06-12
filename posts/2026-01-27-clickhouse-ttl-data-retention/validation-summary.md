# Validation Summary: How to Implement ClickHouse TTL for Data Retention

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ClickHouse
- MergeTree-family table engines
- ClickHouse TTL clauses for rows, columns, movement, and aggregation
- ClickHouse storage policies and S3 disks
- ClickHouse materialized views
- ClickHouse system tables

## Sources Consulted
- ClickHouse Docs: Manage data with TTL (time-to-live) - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse Docs: MergeTree table engine, TTL syntax and storage policies - https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Docs: MergeTree table settings - https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse Docs: Manipulations with Table TTL - https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse Docs: External disks for storing data - https://clickhouse.com/docs/operations/storing-data
- ClickHouse Docs: system.parts - https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse Docs: system.merges - https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse Docs: AggregateFunction type - https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse Docs: AggregatingMergeTree table engine - https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Docs: Build a rollup with materialized views for fast time-series analytics - https://clickhouse.com/docs/knowledgebase/materialized-view-rollup-timeseries

## Issues Found
- The post said multiple TTL rules are evaluated in order and the first matching rule is applied. Official examples describe conditional DELETE TTL rules as rules that apply to expired rows matching their WHERE clause, so the explanation was changed to recommend mutually exclusive conditions when exactly one retention period should apply.
- The materialized-view rollup example used `SummingMergeTree` with finalized `avg`, `min`, and `max` values. This is incorrect because `SummingMergeTree` sums numeric columns with matching keys. The example now uses `AggregatingMergeTree` with `AggregateFunction` columns, `avgState` / `minState` / `maxState` / `countState` in the materialized view, and `avgMerge` / `minMerge` / `maxMerge` / `countMerge` when querying.
- The TTL `GROUP BY` rollup example grouped by `toStartOfHour(timestamp)` directly while the primary key did not expose that grouped bucket as a prefix column. ClickHouse requires the TTL `GROUP BY` expression to be a prefix of the primary key. The example now adds an `hour` column and uses `ORDER BY (metric_name, datacenter, hour)` with the same prefix in the TTL `GROUP BY`.
- The TTL `GROUP BY` section included an unverified version-specific claim, "ClickHouse 22.1+". The version note was removed because the current official docs document the feature without that version constraint.
- The TTL merge-behavior section showed `SET merge_with_ttl_timeout`, `SET min_age_to_force_merge_seconds`, and `merge_selector_algorithm_version`. These are MergeTree settings configured globally under `<merge_tree>` or per table with `ALTER TABLE ... MODIFY SETTING`, and `merge_selector_algorithm_version` is not a current documented TTL tuning setting. The examples were changed to use `ALTER TABLE ... MODIFY SETTING` for documented settings, including `merge_with_recompression_ttl_timeout`.
- The post suggested `OPTIMIZE TABLE metrics` as a less resource-intensive TTL trigger. Official TTL guidance documents `OPTIMIZE TABLE ... FINAL` and `ALTER TABLE ... MATERIALIZE TTL` for forcing TTL materialization. The example now uses `ALTER TABLE metrics MATERIALIZE TTL`.
- The `system.merges` monitoring query selected `event_time`, which is not a documented column in `system.merges`. That column was removed from the query.

## Review Notes
The post is technically relevant and current after the fixes. I did not run the SQL against a live ClickHouse server in this workspace; validation was performed against official ClickHouse documentation.
