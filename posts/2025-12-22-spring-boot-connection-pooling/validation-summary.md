# Validation Summary: How to Configure Connection Pooling in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- JDBC
- HikariCP
- PostgreSQL JDBC driver
- Spring Boot Actuator
- Micrometer
- JMX

## Sources Consulted
- Spring Boot Reference Documentation, SQL Databases: https://docs.spring.io/spring-boot/reference/data/sql.html
- Spring Boot Reference Documentation, Metrics / DataSource Metrics: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- HikariCP README / Configuration: https://github.com/brettwooldridge/HikariCP
- HikariCP Micrometer metrics source: https://github.com/brettwooldridge/HikariCP/blob/dev/src/main/java/com/zaxxer/hikari/metrics/micrometer/MicrometerMetricsTracker.java
- pgJDBC server-prepared statements documentation: https://jdbc.postgresql.org/documentation/server-prepare/

## Issues Found
- The programmatic configuration example declared the configuration class as `HikariConfig`, which shadows `com.zaxxer.hikari.HikariConfig` and makes `new HikariConfig()` refer to the enclosing class instead of HikariCP's configuration class. Renamed the Spring configuration class to `HikariDataSourceConfig`.
- The `keepalive-time` comment described the property as idle connection validation. Updated it to describe HikariCP's keepalive behavior and noted that it must be less than `max-lifetime`.
- The production configuration recommended `connection-test-query=SELECT 1` unconditionally. HikariCP recommends not setting this for JDBC4-compliant drivers because it can use `Connection.isValid()`. Changed the example to make it an optional legacy-driver setting.
- The Micrometer example used `HikariDataSourceMetrics`, which is not the current Spring Boot/HikariCP integration pattern. Replaced it with Spring Boot Actuator configuration and noted that DataSource and HikariCP metrics are auto-configured when Actuator and Micrometer are on the classpath.
- The initialization failure example described `setInitializationFailTimeout(60000)` as retrying for 60 seconds. HikariCP documents it as the timeout for acquiring and validating an initial connection before failing startup. Updated the comment accordingly.

## Review Notes
The pool sizing formula is a common HikariCP guideline, but it should still be treated as a starting point and validated with production workload metrics. The listed Prometheus-style metric names use underscore naming as exposed by Prometheus; Micrometer's canonical meter names use dotted names such as `hikaricp.connections.active`.
