# Validation Summary: How to Fix 'Received timeout' Errors in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- ClickHouse (server settings, profiles, system tables)
- SQL (ClickHouse dialect)
- XML configuration (users.xml profiles)
- Linux networking CLI tools (nc, ping)

## Sources Consulted
- ClickHouse Settings documentation: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse `system.settings`: https://clickhouse.com/docs/operations/system-tables/settings
- ClickHouse `system.processes`: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse `system.clusters`: https://clickhouse.com/docs/operations/system-tables/clusters
- ClickHouse source `Settings.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- ClickHouse source `Defines.h`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Defines.h
- ClickHouse source `ReadBufferFromPocoSocket.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/IO/ReadBufferFromPocoSocket.cpp

## Issues Found
1. **Invalid setting `distributed_connection_timeout`** — this setting does not exist in ClickHouse. The correct setting for shard/failover connection timeout is `connect_timeout_with_failover_ms` (default 1000ms). Fixed in two places: the timeout table row and the `SET` example in the distributed query section. The duplicate `SET connect_timeout_with_failover_ms` was replaced with `SET connect_timeout_with_failover_secure_ms` to provide a meaningful second tunable.
2. **Incorrect column `host_port` in `system.clusters`** — the real column name is `port` (UInt16). Updated the SELECT in the distributed section accordingly.

## Review Notes
- The error text shown (`DB::Exception: Received timeout while reading from socket. (SOCKET_TIMEOUT)`) is a paraphrase; the exact server-side log reads `Timeout exceeded while reading from socket ... (SOCKET_TIMEOUT)`. The phrasing users encounter can vary by client/driver, and "Received timeout" is a common user-facing framing, so the text was left as-is to align with the post's searchable title.
- All other verified defaults (`connect_timeout` 10s, `receive_timeout` 300s, `send_timeout` 300s, `max_execution_time` 0) match current ClickHouse source.
- `enable_http_compression`, `http_zlib_compression_level` (range 1–9), and `/etc/clickhouse-server/users.xml` profile structure are all valid.
- `system.settings` (name, value, description) and `system.processes` (query_id, elapsed, read_rows, read_bytes, memory_usage, query) column references are correct.
