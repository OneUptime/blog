# Validation Summary: Why Does `pg_stat_activity` Look Frozen? Refreshing PostgreSQL Statistics Snapshots Correctly

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- PostgreSQL
- SQL
- `pg_stat_activity` and the cumulative statistics system
- `psql`
- Database monitoring and polling

## Sources Consulted

- [PostgreSQL: The Cumulative Statistics System (current)](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL 15: The Cumulative Statistics System](https://www.postgresql.org/docs/15/monitoring-stats.html)
- [PostgreSQL 14: The Statistics Collector](https://www.postgresql.org/docs/14/monitoring-stats.html)
- [PostgreSQL: Run-time Statistics](https://www.postgresql.org/docs/current/runtime-config-statistics.html)
- [PostgreSQL 15 Release Notes](https://www.postgresql.org/docs/15/release-15.html)
- [PostgreSQL: Date/Time Functions and Operators](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL: System Information Functions and Operators](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL: `psql` Prompting](https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-PROMPTING)
- [PostgreSQL: `pg_settings`](https://www.postgresql.org/docs/current/view-pg-settings.html)
- [PostgreSQL: Predefined Roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL: `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL 18 source: activity and wait-event reporting](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/adt/pgstatfuncs.c)
- [PostgreSQL 18 source: activity snapshot caching](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/activity/backend_status.c)
- [PostgreSQL 18 source: statistics snapshot clearing](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/activity/pgstat.c)

## Issues Found

- The `psql` prompt description referred to the default prompt generally. In the secondary prompt, `*` can also come from `%R` for an unfinished block comment. The text now identifies the default primary prompt and its `%x` transaction-status character, matching the official prompting documentation.
- The statement that an in-progress query or transaction does not affect displayed cumulative totals omitted the continuously updated transaction-local `pg_stat_xact_*` views. The text now limits the claim to ordinary cumulative-statistics views and states the exception.

## Review Notes

- All SQL snippets were executed successfully against PostgreSQL 14.17. A two-session test also reproduced cached `state`, `query_start`, `state_change`, and `query` values while `clock_timestamp()` advanced and the directly read wait-event fields changed independently.
- The post correctly limits the shared-memory flush description and `stats_fetch_consistency` behavior to PostgreSQL 15 and later. PostgreSQL 14 uses the older statistics collector architecture but has the same transaction-scoped current-activity snapshot behavior.
- `pg_current_xact_id_if_assigned()` is available in PostgreSQL 13 and later, including every PostgreSQL release supported on the validation date. Its possible `NULL` result is correctly not treated as proof that no transaction is open.
- `clock_timestamp()` is volatile and can differ slightly between rows in one result set; this does not affect its use here to demonstrate advancing wall-clock time.
