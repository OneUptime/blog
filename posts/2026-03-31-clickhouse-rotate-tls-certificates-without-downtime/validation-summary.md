# Validation Summary: How to Rotate TLS Certificates in ClickHouse Without Downtime

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- ClickHouse (server configuration, system tables, SQL commands)
- OpenSSL (certificate generation, CSR signing, connection verification)
- TLS/SSL (certificate rotation, server and client certificates)
- Linux signals (SIGHUP for config reload)

## Sources Consulted
- [ClickHouse Configuration Files](https://clickhouse.com/docs/operations/configuration-files) — config reload mechanisms, file watching
- [ClickHouse SYSTEM Statements](https://clickhouse.com/docs/sql-reference/statements/system) — SYSTEM RELOAD CONFIG command
- [Configuring TLS in ClickHouse](https://clickhouse.com/docs/guides/sre/tls/configuring-tls) — openSSL config structure, tag names, verification modes
- [ClickHouse Network Ports](https://clickhouse.com/docs/guides/sre/network-ports) — port 9440 for secure native protocol
- [system.clusters Table](https://clickhouse.com/docs/operations/system-tables/clusters) — column names and semantics
- [ClickHouse Server Settings](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — config_reload_interval_ms
- [Poco NetSSL Context.h](https://github.com/ClickHouse/poco/blob/master/NetSSL_OpenSSL/include/Poco/Net/Context.h) — VerificationMode enum values
- [GitHub Issue #15764](https://github.com/ClickHouse/ClickHouse/issues/15764) — Dynamic TLS certificate reload feature request
- [GitHub PR #52030](https://github.com/ClickHouse/ClickHouse/pull/52030) — Certificate file watching in ConfigReloader

## Issues Found
No technical issues found. All code examples, commands, configuration snippets, and technical claims are accurate.

## Review Notes
- **Auto-reload alternative**: ClickHouse also supports automatic detection of config file changes via its internal `ConfigReloader` (polling interval configurable via `config_reload_interval_ms`, default ~2 seconds). The blog's approach of using SIGHUP or `SYSTEM RELOAD CONFIG` is correct and provides explicit control, but readers should know that simply replacing certificate files in-place would also trigger a reload automatically.
- **`is_active` column caveat**: The `is_active` column in `system.clusters` is specifically populated for clusters using the Replicated database engine. For standard distributed clusters, this column will be NULL. The query is valid but may not be informative for all cluster configurations. Columns like `errors_count` or `estimated_recovery_time` could serve as additional health indicators.
- **`SYSTEM RELOAD CONFIG` scope**: The official documentation describes this command as primarily for reloading configuration stored in ZooKeeper. In practice it triggers a general config re-read that includes the openSSL section, but the canonical mechanism for TLS certificate reload is the automatic file watcher or SIGHUP signal.
- **Connection behavior precision**: The statement "without dropping connections" is accurate — the reload operation does not terminate existing connections. Existing TLS sessions continue on their already-established parameters, while new connections use the updated certificates. This is standard TLS behavior rather than a special ClickHouse feature.
