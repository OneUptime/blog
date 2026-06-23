# Validation Summary: How to Set Up Integration Testing in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot (`@SpringBootTest`, `@DataJpaTest`, `@AutoConfigureMockMvc`, `@DynamicPropertySource`, `@ActiveProfiles`)
- Spring Test / MockMvc
- Spring Security Test (`@WithMockUser`)
- JUnit 5 (Jupiter)
- Testcontainers (PostgreSQL, GenericContainer/Redis, Kafka, JUnit Jupiter integration, JDBC URL support)
- WireMock (JUnit 5 `WireMockExtension`)
- Maven (`pom.xml` dependencies)

## Sources Consulted
- Spring Boot Testing reference docs — https://docs.spring.io/spring-boot/reference/testing/index.html
- Spring Boot `@DataJpaTest` / test slices — https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
- Spring Framework `@DynamicPropertySource` — https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-dynamicpropertysource.html
- Testcontainers Kafka module — https://java.testcontainers.org/modules/kafka/
- Testcontainers PostgreSQL module & JDBC URL scheme — https://java.testcontainers.org/modules/databases/jdbc/
- WireMock JUnit 5 extension docs — https://wiremock.org/docs/junit-jupiter/
- Spring Security `@WithMockUser` / testing — https://docs.spring.io/spring-security/reference/servlet/test/method.html

## Issues Found
- **Deprecated Testcontainers Kafka API.** The "Multiple Containers" example used `org.testcontainers.containers.KafkaContainer`, which is deprecated. For Confluent `cp-kafka` images (the post uses `confluentinc/cp-kafka:7.4.0`), the current replacement is `org.testcontainers.kafka.ConfluentKafkaContainer` (compatible with cp-kafka 7.4.0+). Updated the declaration from `KafkaContainer kafka = new KafkaContainer(...)` to `ConfluentKafkaContainer kafka = new ConfluentKafkaContainer(...)`. The `getBootstrapServers()` accessor used in `@DynamicPropertySource` is available on the new class, so the rest of the example is unchanged.

## Review Notes
- All other code is technically correct: `@SpringBootTest`/`@AutoConfigureMockMvc` with MockMvc, `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = Replace.NONE)` to run against a real Testcontainers DB, `@DynamicPropertySource` wiring, and the WireMock JUnit 5 `WireMockExtension.newInstance().options(wireMockConfig().dynamicPort())` pattern are all current and accurate.
- The Testcontainers JDBC URL `jdbc:tc:postgresql:15-alpine:///testdb` with `ContainerDatabaseDriver` is a valid alternative configuration; it works independently of the `@DynamicPropertySource` approach shown elsewhere (a reader should pick one, not both, per test class).
- `withReuse(true)` requires the user to opt in via `testcontainers.reuse.enable=true` in `~/.testcontainers.properties`; otherwise it is silently ignored. Not an error, but worth knowing.
- The security tests' expected status codes (401 unauthenticated, 403 for insufficient role) assume a stateless REST security configuration (e.g., HTTP Basic / bearer with an `AuthenticationEntryPoint` returning 401). With form-login defaults an unauthenticated request would instead redirect (3xx), so these expectations are config-dependent but reasonable for an API.
- The Multiple Containers example would also need the `org.testcontainers:kafka` (and a Redis client) dependency in addition to the `pom.xml` shown, which lists only the core PostgreSQL setup. This is acceptable for a focused tutorial snippet.
