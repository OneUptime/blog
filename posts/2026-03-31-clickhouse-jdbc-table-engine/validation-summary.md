# Validation Summary: How to Use JDBC Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse JDBC table engine
- ClickHouse JDBC Bridge
- PostgreSQL (primary example)
- MySQL / Oracle / SQL Server (mentioned)
- SQL (CREATE TABLE, SELECT, INSERT, DROP TABLE)

## Sources Consulted
- [ClickHouse JDBC Table Engine docs](https://clickhouse.com/docs/en/engines/table-engines/integrations/jdbc)
- [ClickHouse JDBC Bridge README (GitHub)](https://github.com/ClickHouse/clickhouse-jdbc-bridge/blob/master/README.md)
- [ClickHouse docs: Connecting ClickHouse to external data sources with JDBC](https://clickhouse.com/docs/integrations/jdbc/jdbc-with-clickhouse)
- [clickhouse-jdbc-bridge mariadb10.json example](https://github.com/ClickHouse/clickhouse-jdbc-bridge/blob/master/misc/quick-start/jdbc-bridge/config/datasources/mariadb10.json)

## Issues Found
- **Invalid JDBC Bridge startup flags**: The original post showed `java -jar clickhouse-jdbc-bridge.jar --listen-host 0.0.0.0 --listen-port 9019`. The clickhouse-jdbc-bridge does not accept `--listen-host` or `--listen-port` CLI flags. Per the official README, server listen settings are configured via `config/httpd.json` and `config/vertx.json`, not command-line arguments. Fixed the command to the documented form `java -jar clickhouse-jdbc-bridge-<version>-shaded.jar`, noted the default port 9019, and added a short sentence pointing to the correct configuration files for listen host/port.
- **Datasource file location**: Clarified that datasources are placed as JSON files under `config/datasources/` (e.g., `config/datasources/pg_prod.json`) rather than a single top-level `datasources.json`, matching the layout used in the official repo's quick-start.

## Review Notes
- The JDBC engine syntax `ENGINE = JDBC(datasource_uri, external_database, external_table)` used in the post matches the official docs, and passing either a raw JDBC URL or a named datasource as the first argument is both supported.
- The PostgreSQL → ClickHouse type mapping shown (`integer → Int32`, `bigint → Int64`, `varchar → String`, `timestamp → DateTime`, `numeric(p,s) → Decimal(p,s)`, `boolean → UInt8`) aligns with how the JDBC bridge maps JDBC types.
- The datasources JSON example uses top-level `username` / `password`, which matches the format shown in ClickHouse's own JDBC integration docs. The upstream repo's sample configs sometimes nest credentials under a `dataSource` object and include `driverUrls`; both styles are accepted by HikariCP, so the simpler form in the post is acceptable for a tutorial.
- The "Using JDBC Table in a Materialized View Pipeline" section actually shows an ad-hoc `INSERT ... SELECT` rather than a `MATERIALIZED VIEW` definition. The query itself is valid, but the heading could be more precise (e.g., "Scheduled Sync Pipeline"). Not changed since it is a stylistic rather than a technical error.
- ClickHouse upstream labels the JDBC engine as experimental and no longer actively developed; the upstream JDBC bridge repo was archived in October 2025. The post does not mention this, but the described behavior is still accurate for existing deployments. Worth noting in future updates.
