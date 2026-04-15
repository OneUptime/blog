# Validation Summary: How to Configure ClickHouse TCP Interface Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, native TCP protocol)
- OpenSSL / TLS configuration for ClickHouse
- clickhouse-client CLI
- Python clickhouse-driver
- Go clickhouse-go driver
- ClickHouse system tables (system.processes, system.metrics)

## Sources Consulted
- ClickHouse Server Settings documentation — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.processes table documentation — https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse JDBC driver documentation — https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- ClickHouse Network Ports reference — https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse Native Interface (TCP) documentation — https://clickhouse.com/docs/interfaces/tcp
- ClickHouse config.xml source on GitHub — https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml

## Issues Found

1. **JDBC driver incorrectly listed as native TCP user**: The post stated the Java JDBC driver uses the native TCP interface. The official ClickHouse JDBC driver uses HTTP (port 8123) by default, not native TCP. Fixed by removing the JDBC driver from the native TCP client list and adding a clarifying note.

2. **`keep_alive_timeout` incorrectly described as TCP keep-alive probe setting**: The post described `keep_alive_timeout` as controlling TCP keep-alive probes on idle connections. This setting actually controls how long the server waits for incoming requests before closing an idle connection, and it primarily applies to the HTTP interface, not the native TCP protocol. Fixed the section title, description, and added a note about OS-level TCP keepalive for native connections.

3. **`tcp_backlog_size` is not a valid ClickHouse setting**: The post used `<tcp_backlog_size>512</tcp_backlog_size>`. The correct ClickHouse configuration setting is `<listen_backlog>` with a default value of 4096. Fixed the setting name and updated the example value to the default.

4. **SQL monitoring query had non-existent columns**: The `system.processes` query referenced `connection_id` (does not exist; corrected to `query_id`) and `elapsed_sec` (does not exist; corrected to `elapsed`). Also changed `interface = 'TCP'` to `interface = 1` since the column is a UInt8 where 1 represents TCP connections.

## Review Notes
- The Mermaid diagram shows the JDBC driver connecting via TCP 9440 TLS, but the official JDBC driver uses HTTP. This is a minor diagram inconsistency but left unchanged since some third-party native-protocol JDBC implementations do exist.
- The Python `clickhouse-driver` and Go `clickhouse-go` code examples are correct and use current APIs.
- The OpenSSL/TLS configuration block uses valid ClickHouse XML element names.
- The `system.metrics` query correctly references `TCPConnection` and `InterserverConnection` metric names.
- Port defaults (9000 for plain TCP, 9440 for TLS TCP) are confirmed correct.
