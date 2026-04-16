# Validation Summary: How to Fix 'Maximum distributed connections reached' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (server configuration, distributed tables, system tables)
- XML-based server/user configuration (`config.xml`, `users.xml`)
- SQL (system tables, `SET` statements, async inserts)

## Sources Consulted
- ClickHouse settings reference — https://clickhouse.com/docs/operations/settings/settings
- ClickHouse server configuration — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- `system.clusters` table — https://clickhouse.com/docs/operations/system-tables/clusters
- `system.metrics` / `system.processes` tables — https://clickhouse.com/docs/operations/system-tables
- Async insert settings — https://clickhouse.com/docs/operations/settings/settings#async_insert
- ClickHouse source ErrorCodes — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp

## Issues Found
1. **Fabricated error messages.** Original post used `Too many connections to replica. Maximum connections: 1024. (TOO_MANY_SIMULTANEOUS_QUERIES)` and `Maximum distributed connections reached. (NETWORK_ERROR)` — neither is a verbatim ClickHouse error. Replaced with the realistic `ALL_CONNECTION_TRIES_FAILED` (the actual error raised when the distributed connection pool is exhausted) and a correctly-phrased `TOO_MANY_SIMULTANEOUS_QUERIES` example.
2. **Incorrect placement of `distributed_connections_pool_size`.** The original put it in `config.xml` as a top-level setting. This setting is a user/profile setting (documented under `operations/settings/settings`), so it must live inside a `users.xml` profile (or be set per-session via `SET`). Corrected Fix 1 accordingly and kept `max_connections` as the `config.xml` setting.
3. **Non-existent user setting `max_concurrent_select_queries_for_user`.** Only `max_concurrent_queries_for_user` exists as a user-profile setting. The server-level variants are `max_concurrent_select_queries` and `max_concurrent_insert_queries`. Removed the bogus per-user SELECT limit and added the correct server-level SELECT/INSERT limits.
4. **Misleading `keep_alive_timeout` explanation.** Docs state this setting applies to the HTTP protocol only and does not affect the native inter-shard TCP pool used by `Distributed` tables. Reframed the fix to clearly say it helps HTTP client connection reuse (which in turn relieves `max_connections` pressure) rather than distributed inter-shard connections.
5. **Wrong setting name `concurrent_threads_soft_limit`.** The real server setting is `concurrent_threads_soft_limit_num` (with `concurrent_threads_soft_limit_ratio_to_cores` as the ratio variant). Renamed.
6. **Wrong column `host_port` in `system.clusters`.** The column is `port`, not `host_port`. Corrected the SQL in the "Identifying the Bottleneck" section.
7. **Incomplete `<compression>` block.** The original had only `<method>lz4</method>` inside `<case>`, which is technically parseable but doesn't match the documented structure. Added `<min_part_size>` and `<min_part_size_ratio>` so the example matches official docs.

## Review Notes
- The async insert section, `system.metrics`/`system.processes` queries, `max_concurrent_queries`, `max_concurrent_queries_for_user`, `max_waiting_queries`, and the `errors_count`/`estimated_recovery_time` columns were all verified accurate.
- `max_connections` docs describe it simply as "max server connections" without an explicit HTTP/TCP split, so the post's framing around it is reasonable.
- The underlying root cause of pool exhaustion is normally `ALL_CONNECTION_TRIES_FAILED` or a `ConnectionPoolWithFailover` timeout — readers encountering the literal phrase "Maximum distributed connections reached" may actually be hitting these.
- `distributed_connections_pool_size` defaults to 1024 in recent ClickHouse versions; raising it much higher should be paired with matching `max_connections` bumps on the remote shards.
