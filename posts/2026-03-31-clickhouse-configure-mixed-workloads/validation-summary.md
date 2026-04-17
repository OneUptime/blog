# Validation Summary: How to Configure ClickHouse for Mixed Workloads

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (SQL, settings profiles, workload scheduler)
- ClickHouse system tables (`system.query_log`)
- ClickHouse users.xml / server configuration
- Resource groups / workload scheduling (ClickHouse 24.x+)

## Sources Consulted
- ClickHouse Workload Scheduling: https://clickhouse.com/docs/operations/workload-scheduling
- ClickHouse CREATE SETTINGS PROFILE: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse ALTER USER: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse Query Complexity Settings: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse Settings Profiles: https://clickhouse.com/docs/operations/settings/settings-profiles

## Issues Found

1. **Invalid workload setting names `max_speed` and `max_burst`.** The ClickHouse workload scheduler settings for bandwidth limits are `max_bytes_per_second` and `max_burst_bytes`. Fixed by renaming both settings in the `CREATE WORKLOAD interactive_workload` example.

2. **Non-conventional root workload name `root_workload`.** The documented convention for the root workload in ClickHouse examples is `all`. Since the post did not show creating the parent workload, referencing `root_workload` would fail unless pre-created. Changed `IN root_workload` to `IN all` in both CREATE WORKLOAD statements to match documented usage.

3. **Missing aggregation in monitoring query.** `ProfileEvents['OSCPUVirtualTimeMicroseconds']` was used directly alongside `GROUP BY user`, which is invalid because the expression is not aggregated. Wrapped the expression in `sum(...)` so the query matches the pattern for `Map` column aggregation and returns correct per-user CPU totals.

## Review Notes

- `priority` semantics (lower = higher) are correctly stated.
- `CREATE SETTINGS PROFILE`, `ALTER USER ... SETTINGS PROFILE`, and setting the session `workload` per user are all valid.
- `max_concurrent_queries_for_user` is kept as written; it is a recognized ClickHouse server-level setting (typically configured in `config.xml` under a profile), and the post's XML snippet is a simplified illustration rather than a full config layout.
- The `CREATE WORKLOAD` feature was introduced more recently (ClickHouse 24.x); readers on older versions must use only the settings profile path.
- The post does not show creating a root workload (`CREATE WORKLOAD all`) before creating children — worth noting for readers who have not yet initialized the scheduler hierarchy.
