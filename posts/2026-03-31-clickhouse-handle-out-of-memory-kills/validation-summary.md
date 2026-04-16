# Validation Summary: How to Handle ClickHouse Out-of-Memory Kills

## Status
validated

## Post Type
Tutorial / Incident response guide

## Technologies Covered
- ClickHouse (server configuration, SQL settings, system tables)
- Linux OOM killer (`dmesg`, `journalctl`)
- XML-based ClickHouse configuration (`users.xml`, `config.xml`)

## Sources Consulted
- ClickHouse `system.query_log` reference: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `ALTER USER` statement reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse server settings (`max_server_memory_usage_to_ram_ratio`, `total_memory_tracker_sample_probability`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse query-level settings (`max_memory_usage`, `max_bytes_before_external_group_by`): https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse `system.trace_log` (MemorySample): https://clickhouse.com/docs/en/operations/system-tables/trace_log

## Issues Found
1. **Incorrect column name in `system.query_log` query.** The post used `peak_memory_usage` both in the `SELECT` list and in the `ORDER BY`. That column does not exist as a top-level column in `system.query_log`; the correct column is `memory_usage` (UInt64). `peak_memory_usage` only appears as a key inside the `ProfileEvents` map. Changed `peak_memory_usage` → `memory_usage` and renamed the alias `peak_gb` → `memory_gb`. Also removed the redundant `toDateTime(query_start_time)` wrapper since `query_start_time` is already `DateTime`.
2. **Invalid `ALTER USER ... SETTINGS` syntax.** The documented grammar for `ALTER USER` requires `ADD SETTINGS` or `MODIFY SETTINGS`; bare `SETTINGS` is not in the grammar (it is valid for `CREATE USER`, not `ALTER USER`). Changed `ALTER USER analyst SETTINGS max_memory_usage = ...` → `ALTER USER analyst ADD SETTINGS max_memory_usage = ...`.
3. **Mischaracterization of `total_memory_tracker_sample_probability`.** The post described this as enabling "memory overcommit alerts". It does not emit alerts — it samples memory allocations into `system.trace_log` (with `trace_type = 'MemorySample'`) for later profiling. Reworded the sentence to describe the setting accurately as allocation sampling into `trace_log`.

## Review Notes
- `max_server_memory_usage_to_ram_ratio` default is `0.9` in recent ClickHouse versions; the post's suggested value of `0.8` is a reasonable tightening and was left as-is.
- The `SET max_bytes_before_external_group_by` example sets a session-level value; in production, pushing it into a profile in `users.xml` is typically preferred. Not a correctness issue, so no change was made.
- `/var/log/clickhouse-server/clickhouse-server.err.log` is the conventional default path from upstream packages; distro or container images may differ.
- The `dmesg`/`journalctl` commands are correct but require root/privileged access to read in most distros.
