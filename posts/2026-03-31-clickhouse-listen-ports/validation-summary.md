# Validation Summary: How to Configure clickhouse-server Listen Ports and Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server configuration)
- ClickHouse Keeper
- MySQL compatibility interface
- PostgreSQL compatibility interface
- Linux networking tools (ss, ufw)
- systemd (systemctl)

## Sources Consulted
- ClickHouse Network Ports documentation: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse Server Configuration Parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.settings table reference: https://clickhouse.com/docs/operations/system-tables/settings
- ClickHouse system.server_settings table reference: https://clickhouse.com/docs/operations/system-tables/server_settings
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse default config.xml on GitHub: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml

## Issues Found

1. **Incorrect default listen_host claim**: The introduction stated ClickHouse defaults to binding to all addresses (`::`) which is incorrect. ClickHouse defaults to localhost only (`127.0.0.1` / `::1`) when `listen_host` is not explicitly set. This is a deliberate security measure. Fixed the introduction to reflect the correct default behavior.

2. **Wrong ClickHouse Keeper default port**: The default ports table listed port 2181 for ClickHouse Keeper. The actual default `tcp_port` for ClickHouse Keeper is 9181. Port 2181 is the classic Apache ZooKeeper default; ClickHouse Keeper uses 9181 by default (though it can be configured to use 2181 for compatibility). Changed from 2181 to 9181.

3. **Incorrect SQL query for checking active ports**: The query used `system.settings` with non-existent columns `interface` and `bind_address`. The `system.settings` table contains session-level user settings, not server configuration. Fixed to use `system.server_settings` with the correct columns `name` and `value`, and updated the WHERE clause to filter on `%port%` and `%listen%`.

## Review Notes
- The firewall rules section uses `ufw` which is Ubuntu-specific. The ordering of allow-then-deny rules is correct for ufw's first-match-wins processing.
- The `<interserver_http_credentials>` XML structure with `<user>` and `<password>` sub-elements was verified as correct against the official config.xml.
- All XML configuration tag names (`listen_host`, `http_port`, `tcp_port`, `https_port`, `tcp_port_secure`, `mysql_port`, `postgresql_port`, `interserver_http_port`, `interserver_http_host`, `interserver_https_port`) are correct.
- The MySQL and PostgreSQL client connection commands use correct syntax.
- The `system.server_settings` table is available in ClickHouse 23.x and newer. Older versions may not have this table.
