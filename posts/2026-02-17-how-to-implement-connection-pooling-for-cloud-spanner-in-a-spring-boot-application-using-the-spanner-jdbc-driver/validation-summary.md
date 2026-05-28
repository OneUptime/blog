# Validation Summary: How to Use Connection Pooling for Cloud Spanner in a Spring Boot Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner JDBC driver
- Spring Boot
- Spring JDBC and JdbcTemplate
- Spring Data JPA
- HikariCP
- Micrometer and Spring Boot Actuator
- Java

## Sources Consulted
- Google Cloud Spanner sessions documentation: https://docs.cloud.google.com/spanner/docs/sessions
- Google Cloud Spanner JDBC getting started documentation: https://docs.cloud.google.com/spanner/docs/getting-started/jdbc
- Google Cloud Spanner JDBC driver reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner-jdbc/latest/com.google.cloud.spanner.jdbc.JdbcDriver
- Google Cloud Spanner ConnectionOptions reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.connection.ConnectionOptions
- Google Cloud Spanner Spring Data JPA documentation: https://cloud.google.com/spanner/docs/use-spring-data-jpa
- HikariCP configuration documentation: https://github.com/brettwooldridge/HikariCP
- Spring Boot Actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Maven Central metadata for google-cloud-spanner-jdbc: https://central.sonatype.com/artifact/com.google.cloud/google-cloud-spanner-jdbc
- Maven metadata for google-cloud-spanner-hibernate-dialect: https://repo.maven.apache.org/maven2/com/google/cloud/google-cloud-spanner-hibernate-dialect/maven-metadata.xml

## Issues Found
- Updated the Spanner JDBC dependency from `2.15.0` to the current `2.38.0` release.
- Corrected the session-pool explanation. The post previously implied a one-to-one mapping between each JDBC connection and a Spanner session; the Spanner session pool is shared by connections in the same JVM when they use the same database and connection settings.
- Added the Spanner Hibernate dialect dependency and JPA dialect property for the optional Spring Data JPA path, matching Google Cloud's Spring Data JPA guidance.
- Removed the explicit HikariCP `connection-test-query=SELECT 1` setting from the recommended configuration. HikariCP recommends leaving this unset for JDBC4-compliant drivers so it can use `Connection.isValid()`.
- Clarified that `numChannels` configures gRPC channels, while `minSessions` and `maxSessions` configure the Spanner session pool.
- Corrected the pool-sizing guidance so `maxSessions` is based on expected concurrent transactions or queries, with HikariCP maximum pool size as a practical lower bound in typical setups.
- Corrected Spring Boot metric names from Prometheus-style underscore names to Micrometer's dotted names, such as `hikaricp.connections.active`.
- Reworded the `max-lifetime` pitfall to avoid incorrectly stating that each retired HikariCP connection directly destroys a one-to-one Spanner session.

## Review Notes
The examples are illustrative snippets and omit imports and surrounding application code. The current guidance is accurate for the documented JDBC driver behavior and HikariCP configuration, but production pool sizes should still be validated with application-specific load tests.
