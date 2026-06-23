# Validation Summary: How to Configure HikariCP Connection Pooling

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- HikariCP (connection pool)
- Java
- Spring Boot (spring-boot-starter-jdbc, spring-data-jpa, actuator)
- PostgreSQL JDBC driver
- MySQL JDBC driver
- Oracle JDBC driver
- Micrometer / Prometheus metrics
- Grafana (PromQL queries)
- Maven / Gradle build configuration

## Sources Consulted
- HikariCP official README and wiki — configuration knobs and defaults (https://github.com/brettwooldridge/HikariCP)
- HikariCP "About Pool Sizing" wiki — the `(core_count * 2) + effective_spindle_count` formula (https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- Spring Boot reference — data source / HikariCP property binding and Actuator/Micrometer integration (https://docs.spring.io/spring-boot/docs/current/reference/html/data.html)
- PostgreSQL JDBC driver connection parameters (https://jdbc.postgresql.org/documentation/use/)
- MySQL Connector/J configuration properties (https://dev.mysql.com/doc/connector-j/en/)
- Oracle JDBC developer guide connection properties
- Micrometer HikariCP metrics binder (metric names `hikaricp_connections*`)
- Maven Central — HikariCP 5.1.0 and postgresql 42.7.2 artifact versions

## Issues Found
- **Java filename/class name mismatch (fixed).** The advanced Spring Boot example was labeled `// config/HikariConfig.java` while the public class is `HikariConfiguration`. A Java public class must reside in a file matching its name, so this would not compile as labeled. Changed the comment to `// config/HikariConfiguration.java`. (This also avoids confusing the file with HikariCP's own `com.zaxxer.hikari.HikariConfig` class.)

## Review Notes
- HikariCP timeout defaults cited in the post are accurate: `connection-timeout` 30000 ms, `idle-timeout` 600000 ms, `max-lifetime` 1800000 ms, `validation-timeout` 5000 ms. `keepalive-time` defaults to 0 (disabled); the post sets it explicitly and correctly does not label it a "default".
- The pool-sizing formula and the SSD "effective spindle count = 1" guidance match the HikariCP wiki.
- All cited JDBC driver properties (PostgreSQL `preparedStatementCacheQueries`/`binaryTransfer`/`socketTimeout`/`connectTimeout`/`tcpKeepAlive`; MySQL `cachePrepStmts`/`prepStmtCacheSize`/`useServerPrepStmts`/`rewriteBatchedStatements`; Oracle `oracle.jdbc.*`/`oracle.net.CONNECT_TIMEOUT`) are valid for their respective drivers.
- Micrometer metric names (`hikaricp_connections`, `_active`, `_idle`, `_pending`, `_timeout_total`, `_acquire_seconds`, `_creation_seconds`, `_usage_seconds`) are correct; the mermaid diagram uses short forms while the Prometheus reference correctly uses the full `_total`/`_seconds` suffixes.
- HikariCP's own documentation recommends *not* setting `minimum-idle` (letting it equal `maximum-pool-size` for a fixed-size pool gives the best performance). The post sets a lower `minimum-idle`, which is a valid documented option rather than an error — worth noting as a possible future tuning tip.
- The keepalive note "Must be less than idle-timeout and max-lifetime" is sound practical advice; HikariCP strictly requires only that `keepaliveTime < maxLifetime`.
- Minor (left as-is, not a technical error): the `MultiDataSourceConfig` example imports `Qualifier` without using it, and the secondary datasource bean's programmatic pool name ("SecondaryPool") differs from the YAML `pool-name` ("AnalyticsPool"), where YAML binding would win. Neither affects compilation or correctness.
- The `instanceof HikariDataSource hikariDataSource` pattern matching requires Java 16+, consistent with HikariCP 5.x's Java 11+ baseline and modern Spring Boot.
