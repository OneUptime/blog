# Validation Summary: StarRocks Sync vs Async Materialized Views: Which Should You Use?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks
- Synchronous materialized views (rollup indexes)
- Asynchronous materialized views
- StarRocks SQL
- Materialized-view refresh and query rewrite
- Partitioned materialized views

## Sources Consulted

- [Synchronous materialized view](https://docs.starrocks.io/docs/using_starrocks/Materialized_view-single_table/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [CREATE MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/CREATE_MATERIALIZED_VIEW/)
- [SHOW ALTER MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/SHOW_ALTER_MATERIALIZED_VIEW/)
- [Feature Support: Asynchronous Materialized Views](https://docs.starrocks.io/docs/using_starrocks/async_mv/feature-support-asynchronous-materialized-views/)
- [Create a partitioned materialized view](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/create_partitioned_materialized_view/)
- [Query rewrite with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/query_rewrite_with_materialized_views/)
- [Troubleshooting asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/troubleshooting_asynchronous_materialized_views/)
- [Information Schema: task_runs](https://docs.starrocks.io/docs/sql-reference/information_schema/task_runs/)

## Issues Found

- The scheduled asynchronous materialized-view example used the legacy `REFRESH ASYNC EVERY (...)` form. It remains accepted for backward compatibility, but current StarRocks documentation defines `REFRESH SCHEDULE EVERY (...)` as the canonical scheduled-refresh syntax. The example now uses the current form.
- The partitioned asynchronous materialized-view example did not state that partition-level refresh requires a compatible partitioned reference base table. The text now states that `analytics.orders` is assumed to be partitioned using `order_time`.
- The direct-query example did not mention that an asynchronous materialized view must complete its first refresh before it contains queryable materialized results. The text now makes that prerequisite explicit.
- The post referred broadly to asynchronous materialized views being based on “other MVs,” which could include synchronous rollup indexes. The wording now specifies other asynchronous materialized views.
- The comparison table implied that asynchronous materialized views require multiple base tables. It now says “one or more” because asynchronous materialized views can also be built from a single table.
- The initial-build explanation did not account for `REFRESH DEFERRED`. It now distinguishes asynchronous DDL/task submission from the default immediate first refresh and the option to postpone that refresh.
- The phrase “partition-level incremental refresh” could be confused with StarRocks v4.1 incremental view maintenance. The general capability described here refreshes affected partitions, so the wording now says “partition-level refresh.”

## Review Notes

- The synchronous-MV build command, direct-query hint, supported table models, `WHERE` support from v3.1.8, and shared-data support from v3.4.0 match the official documentation.
- Asynchronous materialized views are supported from v2.4, although individual features and external-catalog combinations have later version gates.
- `TRACE REASON MV` is correctly identified as available from v3.2.8.
- Direct asynchronous-MV queries can return stale data under the default direct-read behavior. Automatic rewrite for native base tables uses consistency eligibility checks by default, as the post explains.
