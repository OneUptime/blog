# Validation Summary: How to Use Refreshable Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Refreshable Materialized Views
- SQL (ClickHouse dialect)
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Refreshable Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#refreshable-materialized-view
- ClickHouse official documentation — system.view_refreshes: https://clickhouse.com/docs/en/operations/system-tables/view_refreshes
- ClickHouse official documentation — SYSTEM statements for views: https://clickhouse.com/docs/en/sql-reference/statements/system#refreshable-materialized-views

## Issues Found
1. **Incorrect column names in `system.view_refreshes` query**: The blog used `name` instead of `view`, `refresh_status` instead of `status`, and `last_refresh_result` which does not exist. Corrected to use the actual column names: `view`, `status`, and `exception`.

2. **Fabricated description of `last_refresh_result` column**: The blog stated "The `last_refresh_result` column shows `Finished` on success or the error message on failure." This column does not exist. Replaced with an accurate description: the `status` column shows the current refresh state, and the `exception` column contains the error message if the last refresh failed.

3. **Wrong pause/resume syntax**: The blog used `ALTER TABLE ... MODIFY REFRESH SUSPEND` and `ALTER TABLE ... MODIFY REFRESH RESUME`, which are not valid ClickHouse commands. The correct commands are `SYSTEM STOP VIEW view_name` and `SYSTEM START VIEW view_name`. The `ALTER TABLE ... MODIFY REFRESH` syntax exists but is used to change refresh schedule parameters, not to suspend/resume.

## Review Notes
- The `CREATE MATERIALIZED VIEW ... REFRESH EVERY` syntax, `OFFSET` clause, `DEPENDS ON` clause, and `SYSTEM REFRESH VIEW` command are all correct per official documentation.
- The description of atomic data replacement during refresh is accurate.
- The use cases listed for refreshable materialized views are reasonable and well-chosen.
- ClickHouse also supports a `REFRESH AFTER interval` syntax (for scheduling the next refresh relative to the completion of the previous one) and an `APPEND` mode, which the blog does not mention but is not required for the scope of this tutorial.
