# Validation Summary: How to Use ClickHouse JDBC Driver

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (server, SQL dialect)
- ClickHouse JDBC driver (`com.clickhouse:clickhouse-jdbc` 0.6.5)
- Java JDBC (`java.sql` API)
- HikariCP connection pool
- Spring Boot / Spring `JdbcTemplate`
- Maven and Gradle build tooling

## Sources Consulted
- ClickHouse JDBC repo and 0.6.5 release on Maven Central (`com.clickhouse:clickhouse-jdbc:0.6.5` with `all` classifier)
- ClickHouse JDBC driver source: URL parsing in `ClickHouseNode.of(URI, ...)`, `ClickHouseStatementImpl`, `jdbcCompliant` / `transactionSupport` properties
- ClickHouse JDBC docs for URL syntax `jdbc:(ch|clickhouse)[:<protocol>]://...`
- ClickHouse server docs for client/server settings (`compress`, `socket_timeout`, `ssl`, `sslmode`, `max_execution_time`, `max_memory_usage`)
- HikariCP CHANGES file confirming `keepaliveTime` was added in HikariCP 4.0.0 (PR #1699)
- Spring Boot reference for `spring.datasource.hikari.*` property mapping

## Issues Found
- **Transactions pitfall (line 360)**: The original wording "ClickHouse does not support transactions. `connection.setAutoCommit(false)` has no effect. Each statement is committed immediately." was overstated for clickhouse-jdbc 0.6.x. In V1 of the driver (which 0.6.5 is), `setAutoCommit(false)` is honored via a JDBC-compliance transaction shim when `jdbcCompliant=true` (the default). I rewrote the bullet to clarify that ClickHouse itself does not provide ACID transactions, while noting the driver's compliance shim, and to keep the practical takeaway that statements should be treated as committed on execution.
- **`setFetchSize()` pitfall (line 363)**: The original claim that without `setFetchSize()` "large result sets are buffered entirely in memory before the first row is returned" is inaccurate for the 0.6.x V1 driver, which streams results over HTTP by default. I rewrote the bullet to state that the driver streams by default and to point readers at the driver's `fetch_size` / `result_set_type` configuration if they need to tune behavior.

## Review Notes
- `max_execution_time` and `max_memory_usage` shown in the Connection Properties example are ClickHouse server-side settings rather than first-class JDBC client options, but the V1 driver passes unknown properties through as server settings, so the example still works as written. Worth noting if a future revision re-categorizes these.
- The `jdbc:ch://` URL prefix is correct; `jdbc:clickhouse://` is the equivalent long form. Both are supported in 0.6.x.
- HikariCP's `setKeepaliveTime` requires HikariCP 4.0.0+; the post does not pin a HikariCP version, so users on older Hikari releases will hit a compile error. Minor caveat — not a correctness issue.
- Driver class `com.clickhouse.jdbc.ClickHouseDriver` is correct for 0.6.x. Note that 0.7.x+ (V2) has somewhat different behavior around transactions and result streaming, so the post's advice is best read as 0.6.x-specific.
