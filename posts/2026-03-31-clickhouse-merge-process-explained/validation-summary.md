# Validation Summary: How ClickHouse Merges Data Parts - The Merge Process

## Status
validated

## Post Type
Technical guide / explainer

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse system tables (system.merges, system.parts, system.metric_log)
- MergeTree merge settings and server configuration

## Sources Consulted
- ClickHouse MergeTree table settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse system.metric_log documentation: https://clickhouse.com/docs/operations/system-tables/metric_log
- ClickHouse system.merges documentation: https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse "Too Many Parts" knowledge base: https://clickhouse.com/docs/knowledgebase/exception-too-many-parts
- ClickHouse CollapsingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse insert strategy best practices: https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings

## Issues Found

1. **`background_pool_size` is not a table-level setting**: The post used `ALTER TABLE events MODIFY SETTING background_pool_size = 8;`, but `background_pool_size` is a server-level setting configured in `config.xml`, not a MergeTree table setting. Fixed by replacing the SQL with the correct XML config snippet and a note that it is a server-level setting.

2. **`system.metric_log` query used wrong schema**: The post queried `system.metric_log` with `WHERE metric = '...'` and `SELECT value`, but `system.metric_log` stores each metric as an individual column (wide format), not as rows with `metric`/`value` columns. Fixed the query to `SELECT event_time, CurrentMetric_BackgroundMergesAndMutationsPoolTask FROM system.metric_log`.

3. **CollapsingMergeTree described as performing "deduplication"**: CollapsingMergeTree performs row collapsing (cancellation of +1/-1 sign pairs), not deduplication. Only ReplacingMergeTree performs deduplication. Fixed to distinguish between the two: "deduplication if using ReplacingMergeTree, or row collapsing if using CollapsingMergeTree".

4. **"Too many parts (300)" threshold is outdated**: The default for `parts_to_throw_insert` was increased from 300 to 3000 in ClickHouse v23.6. Fixed the error message example to show 3000.

5. **Insert batching advice was incorrect**: The post recommended "at least 1 row per second per partition", which is essentially the opposite of best practice. ClickHouse recommends no more than 1 INSERT per second, with each INSERT containing thousands of rows. Fixed to "no more than one INSERT per second, with thousands of rows per batch".

6. **`max_bytes_to_merge_at_max_space_in_pool` example value was the default**: The post set this to 161061273600 (150 GiB) as a tuning recommendation, but this is already the default value in modern ClickHouse. Changed to 214748364800 (200 GiB) to make the example a meaningful increase over the default.

## Review Notes
- The overall structure and explanation of the merge process is solid and well-organized.
- The `system.merges` query and `system.parts` query are correct.
- The part naming convention explanation is accurate.
- The `old_parts_lifetime` reference is correct (default 480 seconds).
- The merge execution steps are accurate at a high level, though the actual implementation has more nuance (e.g., horizontal vs vertical merge strategies depending on part size and column count).
