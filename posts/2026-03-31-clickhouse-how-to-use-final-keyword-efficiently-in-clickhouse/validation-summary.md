# Validation Summary: How to Use FINAL Keyword Efficiently in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- CollapsingMergeTree engine
- SummingMergeTree engine
- Materialized Views
- ClickHouse query settings (max_threads, max_final_threads, do_not_merge_across_partitions_select_final, optimize_on_insert)
- ClickHouse system.query_log
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse SELECT FROM docs (FINAL modifier): https://clickhouse.com/docs/en/sql-reference/statements/select/from
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- Altinity Knowledge Base on ReplacingMergeTree and OPTIMIZE FINAL: https://kb.altinity.com/engines/mergetree-table-engine-family/
- ClickHouse GitHub PRs referenced for parallel FINAL evolution (e.g. PR #19375, PR #15938)

## Issues Found
- **"Performance Impact" section contained outdated claims.** The original text stated FINAL "Forces a single-threaded merge of all parts" and "Skips parallel query execution on multi-core machines." This contradicts ClickHouse's current behavior: FINAL has supported parallel execution via `max_final_threads` for many releases, and the article itself explains parallel FINAL a section later. Rewrote these bullets to accurately describe FINAL's cost (applying merge logic at query time, reading more data, potentially reducing parallelism unless tuned) without altering surrounding structure or tone.

## Review Notes
- The post states FINAL is "primarily used with ReplacingMergeTree and CollapsingMergeTree". FINAL also applies to SummingMergeTree, AggregatingMergeTree, and VersionedCollapsingMergeTree. The qualifier "primarily" keeps the statement acceptable, but listing all supported engines would be more precise.
- The Strategy 4 example uses `ORDER BY created_at DESC` while the table CREATE in Strategy 3 does not include a `created_at` column. The examples are intentionally illustrative and schemas can differ across sections, but consistency would improve clarity.
- The "Enabling Parallel FINAL (ClickHouse 22.6+)" section attributes parallel FINAL to 22.6. Parallel FINAL and `do_not_merge_across_partitions_select_final` have existed earlier (with PRs merged around 20.x–21.x). 22.6 did bring improvements to the optimization, so the version claim is not wrong but is imprecise. Left as-is to avoid rewriting.
- `OPTIMIZE TABLE users PARTITION '202401';` uses a quoted partition value. With a `toYYYYMM()` partition key (UInt32), ClickHouse typically accepts either the integer form or `PARTITION ID '202401'`. Most recent ClickHouse versions coerce the quoted form, so left as-is.
- The Materialized View example in Strategy 3 is a minimal illustration and does not actually demonstrate deduplicated aggregation (it counts every insert); in production a real aggregation trigger would be needed. Kept since the intent is illustrative only.
