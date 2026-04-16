# Validation Summary: How to Use ClickHouse Java Client (clickhouse-java)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Java (JDBC API)
- `com.clickhouse:clickhouse-jdbc` driver (clickhouse-java project)
- HikariCP connection pool
- Maven and Gradle build tools

## Sources Consulted
- ClickHouse Java JDBC docs: https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- ClickHouse JDBC V1 docs: https://clickhouse.com/docs/integrations/language-clients/java/jdbc-v1
- clickhouse-java GitHub repo: https://github.com/ClickHouse/clickhouse-java
- Maven Central coordinates for `com.clickhouse:clickhouse-jdbc`: https://mvnrepository.com/artifact/com.clickhouse/clickhouse-jdbc

## Issues Found
1. **Outdated driver version.** The post pinned `0.6.5` (September 2024). The current stable release in early 2026 is `0.9.8`, and the project moved to the JDBC V2 implementation as the default in the `0.8.x` line. Bumped both the Maven and Gradle dependency blocks to `0.9.8` with the `all` classifier (the classifier is still correct).
2. **Misleading transaction calls in the batch insert example.** The example called `conn.setAutoCommit(false)` and `conn.commit()`. ClickHouse does not provide traditional JDBC transactions — in JDBC V2 these are documented as not supported and effectively no-op. Removed both lines so the example reflects how batch writes actually flush through `executeBatch()` against ClickHouse.
3. **Non-idiomatic query-setting parameters.** The "Passing Query Settings via JDBC" section appended `max_execution_time=60&max_memory_usage=10000000000` directly to the JDBC URL and used the legacy `custom_http_params` connection property. In the current V2 driver the idiomatic way to pass ClickHouse server settings is the `clickhouse_setting_<name>` prefix, both on the URL and via `Properties`. Updated both snippets accordingly.

## Review Notes
- The `jdbc:ch://` prefix is valid (shorthand) and so is `jdbc:clickhouse://` — both work. Kept the author's original choice.
- Port `8123` is the correct default HTTP port for ClickHouse.
- The SSL example (`ssl=true&sslmode=strict&sslrootcert=…`) is accepted by the driver and left unchanged. Users wiring up mutual TLS may also want `sslcert` / `sslkey` or a keystore-based configuration, but that is beyond the scope of this tutorial.
- The `CREATE TABLE` statement uses a Java 15+ text block (`"""…"""`), which is worth noting for anyone still on Java 11 or earlier — they will need to concatenate the SQL string instead.
- HikariCP settings shown are all valid for `HikariConfig` in current versions of HikariCP.
