# Validation Summary: How to Disable Unnecessary ClickHouse Interfaces

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- ClickHouse (server config.xml, system tables)
- ClickHouse network protocols (HTTP, HTTPS, native TCP, MySQL, PostgreSQL, gRPC, interserver)
- UFW (Uncomplicated Firewall)
- `ss` networking utility
- ClickHouse SQL (system.query_log, system.server_settings)

## Sources Consulted
- [ClickHouse Network Ports Guide](https://clickhouse.com/docs/guides/sre/network-ports)
- [ClickHouse system.query_log Documentation](https://clickhouse.com/docs/operations/system-tables/query_log)
- [ClickHouse Server Configuration Parameters](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [ClickHouse ClientInfo.h source (Interface enum)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/ClientInfo.h)
- [GitHub Issue #36474 — session_log.interface enum values](https://github.com/ClickHouse/ClickHouse/issues/36474)
- [ClickHouse XML config substitutions / `remove` attribute documentation](https://clickhouse.com/docs/operations/configuration-files)

## Issues Found
- **Incomplete and incorrect interface values list.** The original post claimed `system.query_log.interface` values are `TCP`, `HTTP`, `MySQL`, `gRPC`, `Interserver`. The actual ClickHouse `ClientInfo::Interface` enum (as serialized in `system.query_log`) includes `TCP`, `HTTP`, `gRPC`, `MySQL`, `PostgreSQL`, `LOCAL`, and `TCP_INTERSERVER`. Notably, `PostgreSQL` was missing entirely (a problem since the post elsewhere recommends auditing PostgreSQL interface usage), and the interserver value in the enum is `TCP_INTERSERVER`, not `Interserver`. Updated the line to list the correct enum string values.

## Review Notes
- The default ports table is accurate per official ClickHouse docs (8123/8443/9000/9440/9004/9005/9009/9010). gRPC is referenced in the body but intentionally not listed in the table (its default 9100 is only present when explicitly enabled), which is acceptable.
- The `remove="true"` attribute on config elements is valid ClickHouse XML config substitution syntax.
- `system.server_settings` and `system.query_log` table/column references are correct.
- The `ss -tlnp | grep clickhouse` command and UFW examples are syntactically correct.
- One minor stylistic caveat (not changed): the openSSL block in the "If you need MySQL compatibility, require TLS" example is illustrative only — actual TLS setup requires `certificateFile`, `privateKeyFile`, etc. The post correctly notes "SSL config applies to all secure ports" via comment, signaling it is a placeholder.
