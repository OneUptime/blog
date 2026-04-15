# Validation Summary: How to Use max_temporary_data_on_disk_size in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse settings: `max_temporary_data_on_disk_size`, `max_temporary_data_on_disk_size_for_query`, `max_temporary_data_on_disk_size_for_user`
- ClickHouse external aggregation and sorting (spill to disk)
- `system.query_log` system table

## Sources Consulted
- ClickHouse source code: `src/Core/ServerSettings.cpp` (server-level settings definitions)
- ClickHouse source code: `src/Core/Settings.cpp` (session-level settings definitions)
- ClickHouse source code: `src/Interpreters/TemporaryDataOnDisk.cpp` (error message text)
- ClickHouse source code: `src/Interpreters/QueryLog.cpp` (`written_bytes` column definition)
- ClickHouse official documentation: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse official documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **`max_temporary_data_on_disk_size` incorrectly described as a per-query setting.** The original post stated it "defines the maximum amount of temporary data a single query may write to disk." In reality, `max_temporary_data_on_disk_size` is a server-level setting that caps total temporary disk usage across all queries. The per-query variant is `max_temporary_data_on_disk_size_for_query`. Fixed by clarifying the setting is server-level and introducing the `_for_query` and `_for_user` variants.

2. **SELECT SETTINGS clause used the wrong setting name.** The original post used `max_temporary_data_on_disk_size` in `SETTINGS` clauses on SELECT queries. Server-level settings cannot be set via the query SETTINGS clause — only session-level settings can. Fixed by changing to `max_temporary_data_on_disk_size_for_query` in all SELECT examples.

3. **ALTER USER example used the wrong setting name.** The original `ALTER USER heavy_user SETTINGS max_temporary_data_on_disk_size = ...` would not work because `max_temporary_data_on_disk_size` is a server setting. Fixed by changing to `max_temporary_data_on_disk_size_for_user`.

4. **Error message text was incorrect.** The original post showed `DB::Exception: Too much temporary data written to disk.` The actual error from ClickHouse source code is `Limit for temporary files size exceeded (would consume X / Y bytes)`. Fixed to show the correct error message.

5. **`system.query_log.written_bytes` misused for spill monitoring.** The original post suggested monitoring `written_bytes` to identify spilling queries. However, `written_bytes` only counts bytes written by INSERT queries and is 0 for SELECT queries, making it useless for spill monitoring. Fixed by replacing with `peak_memory_usage` monitoring and tmp_path directory monitoring.

6. **config.xml/users.xml conflation.** The original post said the setting could be applied in "config.xml or users.xml" interchangeably. Clarified that the server-level setting goes in `config.xml`, while per-user limits use the `_for_user` variant in `users.xml` profiles.

## Review Notes
- The `tmp_path` configuration reference is correct — `/var/lib/clickhouse/tmp/` is the default.
- The relationship between `max_bytes_before_external_group_by`, `max_bytes_before_external_sort`, and the temporary data size limits is accurately described.
- ClickHouse also supports a `tmp_policy` setting as an alternative to `tmp_path` for using storage policies with temporary data; this could be a useful addition in a future update.
