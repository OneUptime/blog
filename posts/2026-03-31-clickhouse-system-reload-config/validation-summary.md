# Validation Summary: How to Use SYSTEM RELOAD CONFIG in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse system commands (`SYSTEM RELOAD CONFIG`)
- ClickHouse configuration files (`config.xml`, `users.xml`, `config.d/`, `users.d/`)
- ClickHouse system tables (`system.users`, `system.clusters`, `system.settings`, `system.server_settings`, `system.quotas`)

## Sources Consulted
- ClickHouse official documentation on SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system#reload-config
- ClickHouse official documentation on server configuration files: https://clickhouse.com/docs/en/operations/configuration-files
- ClickHouse official documentation on `system.users` table: https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse official documentation on `system.clusters` table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse official documentation on `system.settings` table: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse official documentation on `system.server_settings` table: https://clickhouse.com/docs/en/operations/system-tables/server_settings
- ClickHouse official documentation on `system.quotas` table: https://clickhouse.com/docs/en/operations/system-tables/quotas
- ClickHouse official documentation on access control and users configuration: https://clickhouse.com/docs/en/operations/access-rights

## Issues Found
1. **Settings profile verification query was misleading** (line 134-137): The query `SELECT name, value FROM system.settings WHERE name IN ('max_memory_usage', 'max_execution_time')` shows the current session's effective settings, not the profile definition. After `SYSTEM RELOAD CONFIG`, you would only see the updated profile values if the current session is using that profile. Fixed by adding `SET profile = 'analyst';` before the SELECT to explicitly activate the profile in the session, making the verification meaningful.

## Review Notes
- The post states that `<macros>` changes require a server restart. In ClickHouse versions 22.3+, macros can be reloaded via `SYSTEM RELOAD CONFIG`. The post's conservative advice (listing it under "requires restart" with a "careful coordination" note) is operationally safe for replicated deployments but slightly outdated for modern ClickHouse versions.
- ClickHouse actually auto-detects changes to config files via a file watcher and can reload many settings automatically. `SYSTEM RELOAD CONFIG` forces an immediate reload rather than waiting for the watcher. The post doesn't mention auto-reload, which is acceptable given its focus on the explicit command.
- All XML configuration snippets use the correct `<clickhouse>` root element (the modern convention, replacing the deprecated `<yandex>` root).
- All system table column names verified as correct: `system.users` (`name`, `storage`, `auth_type`, `host_ip`, `host_names`), `system.clusters` (`cluster`, `shard_num`, `host_name`, `port`, `is_local`), `system.server_settings` (`name`, `value`, `changed`), `system.quotas` (`name`, `keys`, `durations`).
- The comparison table is accurate and helpful.
