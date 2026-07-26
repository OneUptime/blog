# Validation Summary: Why Isn’t StarRocks Using My Materialized View? Diagnose Query Rewrite with TRACE

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- StarRocks asynchronous materialized views
- StarRocks automatic query rewrite
- StarRocks SQL, `EXPLAIN`, and `TRACE`
- StarRocks Information Schema
- Materialized-view refresh and consistency controls

## Sources Consulted

- [Troubleshooting asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/troubleshooting_asynchronous_materialized_views/)
- [Query rewrite with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/query_rewrite_with_materialized_views/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [Feature Support: Asynchronous Materialized Views](https://docs.starrocks.io/docs/using_starrocks/async_mv/feature-support-asynchronous-materialized-views/)
- [SHOW MATERIALIZED VIEWS](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/SHOW_MATERIALIZED_VIEW/)
- [SHOW CREATE MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/SHOW_CREATE_MATERIALIZED_VIEW/)
- [ALTER MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/ALTER_MATERIALIZED_VIEW/)
- [CREATE MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/CREATE_MATERIALIZED_VIEW/)
- [Information Schema `materialized_views`](https://docs.starrocks.io/docs/sql-reference/information_schema/materialized_views/)
- [StarRocks v3.2 `materialized_views` reference source](https://github.com/StarRocks/starrocks/blob/branch-3.2/docs/en/sql-reference/information_schema/materialized_views.md)
- [StarRocks v3.5 `materialized_views` reference source](https://github.com/StarRocks/starrocks/blob/branch-3.5/docs/en/sql-reference/information_schema/materialized_views.md)
- [StarRocks version 3.3 release notes](https://docs.starrocks.io/releasenotes/release-3.3/)
- [Query Profile Overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [Query Profile Metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)

## Issues Found

- `SHOW MATERIALIZED VIEWS` omitted `FROM analytics`, so it searched only the current database and could inspect a different view or return no row. Added the database qualifier.
- The Information Schema query selected `last_refresh_time` and `query_rewrite_status`, which are not available in the v3.2 through v3.5 branches even though the guide supports TRACE versions beginning with v3.2. Replaced them with the version-compatible `last_refresh_finished_time` and `table_rows` fields.
- The post treated a failed initial refresh as a cause of inactive state. Refresh failure and activation state are separate diagnostics, so the text now directs readers to the refresh-state/error fields independently.
- The post advised against `ALTER MATERIALIZED VIEW ... ACTIVE` categorically. Official guidance recommends activation after compatible base-table changes and recreation if activation cannot validate the definition, so the advice was corrected.
- The view-based rewrite paragraph did not state that the complex-view rewrite capability starts in v3.3.0. Added the documented version boundary.
- The staleness wording could imply a generic guarantee about result age. Clarified the exact behavior: while the last refresh is within the configured interval, StarRocks may use the view without checking for base-table changes.
- `query_rewrite_consistency = 'LOOSE'` was described only as weakening checks. Corrected it to state that this materialized-view property disables consistency checks.
- The validation checklist referred to lower “operator cost” in a runtime profile. Replaced that with documented runtime measurements: scanned rows or bytes, CPU time, and operator time.

## Review Notes

- The TRACE syntax and version statements are correct: `TRACE LOGS MV` is available from v3.2, and `TRACE REASON MV` from v3.2.8.
- Text-based rewrite begins in v3.3.0 and uses abstract-syntax-tree matching. Its `ORDER BY` caveat is accurately described.
- The `mv_rewrite_staleness_second` ALTER syntax, native-table consistency behavior, non-deterministic-function limitation, plan inspection guidance, and JDBC-catalog rewrite limitation match the official documentation.
