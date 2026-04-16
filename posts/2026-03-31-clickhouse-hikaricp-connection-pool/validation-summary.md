# Validation Summary: How to Build a ClickHouse Connection Pool with HikariCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HikariCP (Java JDBC connection pool library)
- ClickHouse JDBC driver (`com.clickhouse:clickhouse-jdbc`)
- Java (JDBC APIs: `DataSource`, `Connection`, `PreparedStatement`, `ResultSet`)
- Micrometer (metrics)
- JMX (MBeans)
- Maven (dependency management)

## Sources Consulted
- HikariCP README and documentation: https://github.com/brettwooldridge/HikariCP
- HikariCP `HikariConfig` API (methods: `setJdbcUrl`, `setUsername`, `setPassword`, `setDriverClassName`, `setMaximumPoolSize`, `setMinimumIdle`, `setConnectionTimeout`, `setIdleTimeout`, `setMaxLifetime`, `setKeepaliveTime`, `setConnectionTestQuery`, `setMetricRegistry`, `setRegisterMbeans`)
- ClickHouse Java client / JDBC driver docs: https://clickhouse.com/docs/en/integrations/java
- ClickHouse JDBC driver release notes and artifact `com.clickhouse:clickhouse-jdbc:0.6.0` on Maven Central
- ClickHouse server settings reference (`tcp_keep_alive_timeout`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse SQL reference for `today()` and `count()` functions
- HikariCP Micrometer metric names (`hikaricp.connections.active`, `hikaricp.connections.pending`)

## Issues Found
No technical issues found.

Verifications performed:
- HikariCP 5.1.0 and clickhouse-jdbc 0.6.0 are real, published Maven Central artifacts.
- Driver class `com.clickhouse.jdbc.ClickHouseDriver` is correct for the modern (com.clickhouse) driver.
- The JDBC URL scheme `jdbc:ch://` is a valid short alias supported by clickhouse-jdbc (alongside `jdbc:clickhouse://`).
- All `HikariConfig` setters used (including `setKeepaliveTime`, which was introduced in HikariCP 4.x) exist with the correct signatures and semantics.
- `today() - 1` in ClickHouse returns yesterday's date and is valid in a `WHERE` clause against a `Date`/`DateTime` column.
- The Micrometer metric names are the names HikariCP actually emits.
- `tcp_keep_alive_timeout` is a real ClickHouse server setting with a default of 290 seconds.

## Review Notes
- The clickhouse-jdbc project is transitioning: `com.clickhouse:clickhouse-jdbc` 0.6.x is current, but readers should check for newer 0.7.x / 0.8.x releases when adopting. The APIs used in this post have remained stable.
- The JDBC URL in the post targets port 8123 (HTTP interface). Readers who prefer the native protocol can use port 9000 with the `client-v2` flavor of the driver, but HTTP is the default and matches the post.
- The `tcp_keep_alive_timeout` reference is accurate at the TCP layer; note that HTTP keep-alive on port 8123 is separately governed by the server's `keep_alive_timeout` setting. Either way, the post's advice — enable `keepaliveTime` and a lightweight test query — is the right mitigation.
- The pool-sizing heuristic (`instances * cores * 2`) is a reasonable starting point for mixed workloads; pure analytical workloads often do even better with pools closer to `cores * 1`.
