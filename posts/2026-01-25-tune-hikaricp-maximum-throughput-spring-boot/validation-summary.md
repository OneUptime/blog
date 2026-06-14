# Validation Summary: How to Tune HikariCP for Maximum Throughput in Spring Boot

## Status
validated

## Post Type
Tutorial / performance tuning guide

## Technologies Covered
- Java
- Spring Boot
- HikariCP
- JDBC connection pooling
- PostgreSQL
- MySQL
- Micrometer metrics

## Sources Consulted
- HikariCP README configuration reference: https://github.com/brettwooldridge/HikariCP
- HikariCP pool sizing wiki: https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
- HikariCP MicrometerMetricsTrackerFactory source: https://github.com/brettwooldridge/HikariCP/blob/dev/src/main/java/com/zaxxer/hikari/metrics/micrometer/MicrometerMetricsTrackerFactory.java
- HikariCP MicrometerMetricsTracker source: https://github.com/brettwooldridge/HikariCP/blob/dev/src/main/java/com/zaxxer/hikari/metrics/micrometer/MicrometerMetricsTracker.java
- Spring Boot SQL Databases reference: https://docs.spring.io/spring-boot/reference/data/sql.html
- Spring Boot Data Access how-to for DataSourceProperties and Hikari jdbcUrl mapping: https://docs.spring.io/spring-boot/how-to/data-access.html
- Spring Boot Actuator metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- PostgreSQL connection settings documentation: https://www.postgresql.org/docs/current/runtime-config-connection.html
- MySQL connection limit documentation: https://dev.mysql.com/doc/refman/8.2/en/too-many-connections.html

## Issues Found
- The custom `DataSource` bean created a bare `HikariDataSource` while binding only `spring.datasource.hikari`. In a typical Spring Boot configuration, standard settings such as `spring.datasource.url`, `spring.datasource.username`, and `spring.datasource.password` would not be applied to that manually constructed instance. Updated the example to initialize the `HikariDataSource` from Spring Boot's `DataSourceProperties`, which also handles `url` to Hikari's `jdbcUrl` mapping.
- The Micrometer monitoring example passed a Micrometer `MeterRegistry` to `setMetricRegistry`, but HikariCP documents `metricRegistry` as the Dropwizard/Codahale registry hook. Updated the example to use `setMetricsTrackerFactory(new MicrometerMetricsTrackerFactory(registry))`, matching HikariCP's Micrometer integration, and included the same username/password setup used by the other programmatic examples.

## Review Notes
- The YAML property names, HikariCP timeout defaults, minimum validation/leak-detection constraints, `maximumPoolSize` behavior, and pool sizing formula were consistent with HikariCP and Spring Boot documentation.
- HikariCP recommends leaving `minimumIdle` unset for a fixed-size pool when maximum responsiveness to spikes is the goal. The post's smaller `minimum-idle` examples are valid, but they trade some spike readiness for lower idle resource usage.
