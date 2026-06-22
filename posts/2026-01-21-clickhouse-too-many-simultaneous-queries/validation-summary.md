# Validation Summary: How to Fix Too Many Simultaneous Queries in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- ClickHouse server settings and user/session settings
- ClickHouse system tables
- ClickHouse SQL access management
- ClickHouse query logging and query cancellation
- ClickHouse materialized views and query settings
- Python ClickHouse client patterns
- Node.js `@clickhouse/client`
- Prometheus alerting

## Sources Consulted
- ClickHouse server settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse session settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse query-level and user settings: https://clickhouse.com/docs/operations/settings/query-level
- ClickHouse `system.processes`: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `system.users`: https://clickhouse.com/docs/operations/system-tables/users
- ClickHouse `system.settings_profile_elements`: https://clickhouse.com/docs/operations/system-tables/settings_profile_elements
- ClickHouse `CREATE USER`: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse `ALTER USER`: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse `CREATE SETTINGS PROFILE`: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse `KILL QUERY`: https://clickhouse.com/docs/sql-reference/statements/kill
- ClickHouse JavaScript client: https://clickhouse.com/docs/integrations/javascript
- ClickHouse Prometheus metrics and `system.metrics`: https://clickhouse.com/docs/interfaces/prometheus and https://clickhouse.com/docs/operations/system-tables/metrics

## Issues Found
- The server limit query used `system.settings`, which reports session settings for the current user, not server configuration. Changed it to query `system.server_settings` for server-level values.
- The user-specific limit query selected `user_name` and `max_concurrent_queries_for_user` from `system.users`, but the official `system.users` table does not expose those columns. Replaced it with `system.settings` for current-session limits and `system.settings_profile_elements` for limits assigned directly to users or settings profiles.
- The XML server config example placed `max_concurrent_queries_for_user` at top level in `config.d`, but this is a user/profile setting. Moved it into a `users.d` profile snippet and kept only server settings in `config.d`.
- The profile assignment example used `ALTER USER ... SETTINGS PROFILE`, which is not valid `ALTER USER` syntax. Changed it to `ALTER USER dashboard_user ADD PROFILES 'high_concurrency'`.
- The query queue XML described `max_concurrent_queries_for_all_users` as the maximum queue size. Corrected the comment because the setting is a concurrent query limit, while `queue_max_wait_ms` controls wait time in the request queue.
- The Node.js example imported `@clickhouse/client` without destructuring `createClient` and used `host` instead of the documented `url` option. Updated the import and client configuration.
- The query coalescing Python example awaited a future while still holding the async lock, which could deadlock the scheduled executor task. Moved the await outside the lock.
- The cache example used `time.time()` without importing `time` and included an unused `lru_cache` import. Added `import time` and removed the unused import.
- The Prometheus alert used a non-standard `clickhouse_processes_count` metric. Replaced it with `ClickHouseMetrics_Query`, matching ClickHouse's `Query` metric exposed by the Prometheus exporter.

## Review Notes
The query-log examples that estimate concurrency from query start events are useful for spotting bursts but are not exact historical concurrency calculations because they do not fully account for query end times. The server sizing table is a broad rule of thumb and should be tuned against workload shape, query cost, memory limits, and hardware rather than treated as a fixed ClickHouse requirement.
