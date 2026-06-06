# Validation Summary: How to Use Spring Boot Test for Integration Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot Test
- JUnit 5
- Java
- MockMvc
- Spring MVC test slices
- Spring Data JPA test slices
- Testcontainers
- PostgreSQL
- Awaitility

## Sources Consulted
- Spring Boot 3.5 Reference Documentation - Testing Spring Boot Applications: https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html
- Spring Boot 3.5 Reference Documentation - Testcontainers: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Spring Boot Test Slices Appendix: https://docs.spring.io/spring-boot/appendix/test-auto-configuration/slices.html
- Spring Boot 3.4 API - MockBean deprecation notice: https://docs.spring.io/spring-boot/3.4/api/java/org/springframework/boot/test/mock/mockito/MockBean.html
- Spring Framework API - MockitoBean: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/context/bean/override/mockito/MockitoBean.html
- Spring Framework Reference - MockMvc: https://docs.spring.io/spring/reference/6.0/testing/spring-mvc-test-framework.html
- Testcontainers for Java - Home and dependency guidance: https://java.testcontainers.org/
- Testcontainers for Java - PostgreSQL module: https://java.testcontainers.org/modules/databases/postgres/
- Testcontainers for Java - JUnit 5 integration: https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers for Java - Reusable Containers: https://java.testcontainers.org/features/reuse/
- Awaitility Usage Guide: https://github.com/awaitility/awaitility/wiki/Usage

## Issues Found
- The `@WebMvcTest` example used Spring Boot's deprecated `@MockBean`. Replaced it with Spring Framework's `@MockitoBean` and updated the import because Spring Boot documents `@MockBean` as deprecated since 3.4.0 and for removal in favor of `MockitoBean`.
- The `@DataJpaTest` description said it configures an embedded database unconditionally. Updated the wording to clarify that an embedded database is configured when one is available on the classpath.
- The Testcontainers dependencies used older pre-2.0 coordinates and version `1.19.0`. Updated them to current Testcontainers 2.x coordinates, `testcontainers-postgresql` and `testcontainers-junit-jupiter`, version `2.0.5`.
- The PostgreSQL container imports used the older module package. Updated them to `org.testcontainers.postgresql.PostgreSQLContainer` for Testcontainers 2.x.
- The Testcontainers dependency snippet omitted the JDBC driver requirement. Added a short note that the PostgreSQL JDBC driver must be available on the test runtime classpath.
- The reusable-container example did not mention that reuse is experimental and intended for local opt-in use. Clarified the required opt-in property and added a CI note to omit `withReuse(true)`.

## Review Notes
The remaining examples are illustrative and depend on application-specific classes such as `Order`, `OrderRequest`, `ProductService`, and repositories being defined elsewhere. The post does not specify a Spring Boot major version; the examples remain aligned with Spring Boot 3.5-style imports, while Spring Boot 4 has introduced module and package changes that could be covered in a future version-specific update.
