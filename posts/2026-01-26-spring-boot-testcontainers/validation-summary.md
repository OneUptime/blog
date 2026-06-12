# Validation Summary: How to Use Spring Boot Testcontainers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot
- Testcontainers for Java
- Java
- JUnit 5
- Docker and Docker Compose
- PostgreSQL
- Redis
- Flyway
- MockMvc
- Maven
- Gradle
- GitHub Actions

## Sources Consulted
- Spring Boot 3.5 Testcontainers reference: https://docs.spring.io/spring-boot/3.5/reference/testing/testcontainers.html
- Spring Boot 3.5 managed dependency coordinates: https://docs.spring.io/spring-boot/3.5/appendix/dependency-versions/coordinates.html
- Spring Boot testing Spring Boot applications reference: https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
- Testcontainers JUnit 5 documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers Docker Compose module documentation: https://java.testcontainers.org/modules/docker_compose/
- Testcontainers reusable containers documentation: https://java.testcontainers.org/features/reuse/
- Testcontainers networking documentation: https://java.testcontainers.org/features/networking/
- Testcontainers PostgreSQL module documentation: https://java.testcontainers.org/modules/databases/postgres/

## Issues Found
- The Maven dependency comment incorrectly described `spring-boot-testcontainers` as the Testcontainers BOM. Changed it to describe Spring Boot's Testcontainers integration.
- The setup omitted the PostgreSQL JDBC driver needed by Spring's DataSource. Added `org.postgresql:postgresql` to the Maven and Gradle examples.
- The Testcontainers BOM version was outdated for Spring Boot 3.5-managed Testcontainers. Updated it to `1.21.4` and clarified that it is only needed without Spring Boot dependency management.
- The Redis example claimed there was no `@ServiceConnection` support for Redis. Spring Boot supports Redis service connections, including `GenericContainer` with `@ServiceConnection(name = "redis")`, so the dynamic property registration was replaced.
- The Docker Compose example used deprecated `DockerComposeContainer` and unqualified service names. Updated it to `ComposeContainer` and the current `service-1` naming used by Testcontainers Compose V2.
- The Compose Kafka example was removed because the advertised listener configuration shown would not reliably work from the test JVM through Testcontainers' dynamic port mapping.
- Several Java examples were missing static imports for AssertJ assertions. Added the required imports where the snippets were presented as class-level examples.
- The lifecycle diagram stated that every test runs in a rollback transaction. Adjusted it to say transactional tests can roll back after execution.
- The reusable container example used JUnit-managed `@Container` lifecycle with `.withReuse(true)`. Testcontainers requires reusable containers to be started manually and not stopped indirectly by the JUnit extension, so the snippet was corrected.
- The parallel test execution tip did not mention that the Testcontainers JUnit 5 extension is only tested with sequential execution. Added that caveat.

## Review Notes
- The examples are illustrative and still assume application-specific classes such as `User`, `UserRepository`, `CachedUserService`, and `OrderService` exist.
- The post targets Spring Boot 3.1+ conventions. Spring Boot 4.x and Testcontainers 2.x use newer managed coordinates, so a future dedicated Spring Boot 4 refresh may be useful.
