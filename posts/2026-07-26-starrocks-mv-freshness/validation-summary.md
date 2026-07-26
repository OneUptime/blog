# Validation Summary: How to Keep StarRocks Materialized Views Fresh Without Full-Refresh Overload

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- StarRocks asynchronous materialized views
- StarRocks partitioning and partition-level refresh
- Scheduled and manual materialized-view refresh
- Materialized-view query rewrite and bounded staleness
- Resource groups, spilling, and Information Schema monitoring

## Sources Consulted
- [CREATE MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/CREATE_MATERIALIZED_VIEW/)
- [ALTER MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/ALTER_MATERIALIZED_VIEW/)
- [REFRESH MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/REFRESH_MATERIALIZED_VIEW/)
- [Create a partitioned materialized view](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/create_partitioned_materialized_view/)
- [Data modeling with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/data_modeling_with_materialized_views/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [Troubleshooting asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/troubleshooting_asynchronous_materialized_views/)
- [Understand Materialized View Task Runs](https://docs.starrocks.io/docs/using_starrocks/async_mv/materialized_view_task_run_details/)
- [Information Schema: task_runs](https://docs.starrocks.io/docs/sql-reference/information_schema/task_runs/)
- [Information Schema: materialized_views](https://docs.starrocks.io/docs/sql-reference/information_schema/materialized_views/)

## Issues Found
- The creation example and trigger-policy list used the legacy scheduled-refresh form `REFRESH ASYNC EVERY (...)`. Changed both to the current `REFRESH SCHEDULE EVERY (...)` form. StarRocks still accepts the legacy form for backward compatibility, but current documentation and `SHOW CREATE MATERIALIZED VIEW` use `SCHEDULE`.
- The creation example set `partition_refresh_number` to `1` while selecting the `adaptive` refresh strategy, and the explanation described the configured count as a batch limit. In adaptive mode StarRocks chooses the batch size from source data volume rather than strictly enforcing `partition_refresh_number`. Changed the example to `strict` and clarified that the fixed partition count is enforced under the strict strategy.
- The resource-isolation section implied that intermediate-result spilling must be enabled manually. StarRocks has enabled spilling by default for materialized-view refresh since v3.1. Updated the text to state the default and retained the `ALTER MATERIALIZED VIEW` command for views where spilling has been disabled.

## Review Notes
- The SQL syntax for partition-range refresh, synchronous invocation, forced refresh, materialized-view properties, query-rewrite staleness, and task-run inspection matches the official documentation.
- The version-specific statements about multi-column partition expressions from v3.5.0, the `partition_refresh_number` default from v3.3, and time-based `partition_ttl` from v3.1.5 are consistent with the current SQL reference.
- The warning that direct materialized-view queries can return stale data and that external-catalog materialized views do not provide the same strong-consistency guarantee is accurate.
