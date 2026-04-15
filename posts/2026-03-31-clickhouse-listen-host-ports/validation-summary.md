# Validation Summary: How to Configure ClickHouse Server listen_host and Ports

## Status
validated

## Post Type
Configuration Guide / Reference

## Technologies Covered
- ClickHouse (server configuration)
- XML configuration (`config.xml`, `config.d` drop-in overrides)
- Linux networking tools (`ss`, `ufw`)

## Sources Consulted
- ClickHouse system.metrics table documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.build_options table documentation: https://clickhouse.com/docs/en/operations/system-tables/build_options
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse network ports reference: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse PostgreSQL interface documentation: https://clickhouse.com/docs/interfaces/postgresql
- ClickHouse Server.cpp source (port 0 behavior): https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/Server.cpp
- ClickHouse default config.xml: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml

## Issues Found

1. **Incorrect SQL query against `system.metrics`**: The post contained a SQL query `SELECT interface, port, protocol FROM system.metrics WHERE metric LIKE '%Listen%'` which is invalid. `system.metrics` has columns `metric`, `value`, and `description` — it does not have `interface`, `port`, or `protocol` columns. Removed the incorrect query.

2. **Incorrect `system.build_options` query**: The post suggested querying `system.build_options` as a "more reliable check" for active listeners. This table only contains compile-time build flags, not runtime listener information. Removed this misleading section.

3. **Incorrect hostname DNS claim**: The post stated "Using a DNS name instead of an IP gives you flexibility to change the IP without restarting ClickHouse." This contradicts the preceding sentence that says ClickHouse resolves the hostname at startup. Since the socket binding happens at startup, a DNS change requires a restart. Fixed to accurately state that a restart is needed.

4. **Wrong PostgreSQL wire protocol port**: The post listed port 5432 as the ClickHouse PostgreSQL-compatible protocol port (in both the table and the config snippet). While 5432 is PostgreSQL's own default port, ClickHouse's conventional port for its PostgreSQL wire protocol interface is 9005, as documented in the official ClickHouse docs and default config.xml. Changed to 9005.

## Review Notes
- The claim about port `0` causing an ephemeral port assignment is correct — verified against ClickHouse source code (`Server.cpp`). The advice to remove or comment out elements to disable ports is sound.
- The `listen_try` setting description is accurate.
- The interserver replication protocol is correctly identified as HTTP (port 9009) and HTTPS (port 9010).
- The firewall example uses `ufw` syntax correctly. Note that rule ordering matters with `ufw` — the allow rules should come before the deny rules for the same ports, which is the order shown.
- The `mysql_port` (3306) and `postgresql_port` (9005) are both disabled by default in ClickHouse; they only become active when explicitly configured. The table heading "Standard Ports" could be interpreted as "commonly configured ports" rather than "enabled by default," which is acceptable.
