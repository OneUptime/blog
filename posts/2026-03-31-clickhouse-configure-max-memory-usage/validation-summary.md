# Validation Summary: How to Configure ClickHouse Max Memory Usage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, query settings)
- SQL (ClickHouse dialect)
- XML (config.xml / users.xml)
- ClickHouse system tables (`system.processes`, `system.query_log`)
- ClickHouse settings profiles and user management

## Sources Consulted
- ClickHouse `max_memory_usage` settings — https://clickhouse.com/docs/operations/settings/settings#max_memory_usage
- ClickHouse server-configuration parameters (`max_server_memory_usage_to_ram_ratio`) — https://clickhouse.com/docs/operations/server-configuration-parameters/settings#max_server_memory_usage_to_ram_ratio
- ClickHouse query-complexity settings (`max_bytes_before_external_group_by`, `max_bytes_before_external_sort`) — https://clickhouse.com/docs/operations/settings/query-complexity
- Memory overcommit — https://clickhouse.com/docs/operations/settings/memory-overcommit
- `ALTER SETTINGS PROFILE` syntax — https://clickhouse.com/docs/sql-reference/statements/alter/settings-profile
- `CREATE SETTINGS PROFILE` syntax — https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- `ALTER USER` syntax — https://clickhouse.com/docs/sql-reference/statements/alter/user
- `system.processes` table — https://clickhouse.com/docs/operations/system-tables/processes
- `system.query_log` table — https://clickhouse.com/docs/operations/system-tables/query_log

## Issues Found
1. **Incorrect default for `max_memory_usage`.** The original post stated `default: 10GB`. Per the official docs, the OSS/self-hosted default is `0` (unlimited); 10GB only appears as a Cloud-style default/example. Updated the inline comment to `OSS default: 0, which means unlimited`.
2. **Wrong `ALTER PROFILE` statement.** The original post used `ALTER PROFILE analytics_users SETTINGS ...`, which is not valid ClickHouse syntax. The correct form is `ALTER SETTINGS PROFILE analytics_users SETTINGS ...`. Fixed.

## Review Notes
- `max_server_memory_usage_to_ram_ratio` default in ClickHouse is `0.9` (not `0.8`). The post uses `0.8` as an explicit example and the accompanying comment correctly says "Use at most 80% of total system RAM", so this is intentional illustrative configuration rather than a doc error — left unchanged.
- The `ALTER USER analyst_alice SETTINGS PROFILE heavy_users;` form is an older but historically supported grammar. The currently-documented grammar is `ALTER USER ... ADD PROFILES 'heavy_users'`. The original form still functions on modern ClickHouse, so it was left in place; readers running the newest servers may prefer the `ADD PROFILES` form shown in current docs.
- The post mentions "ClickHouse 22.2+" for memory overcommit. Docs do not display explicit version-introduced tags, so the exact version could not be confirmed, but the feature has been available for years and the claim is plausible. Left unchanged.
- `SET max_memory_usage = '10G';` is valid — ClickHouse accepts memory-suffix strings for UInt64 memory settings.
- `system.processes.peak_memory_usage` is a documented column, so the monitoring query is correct.
