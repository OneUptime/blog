# Validation Summary: How to Build Production-Ready REST APIs with Spring Boot 3

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java 17+
- Spring Boot 3
- Spring MVC REST controllers
- Jakarta Bean Validation
- Spring Web exception handling
- Spring Data pagination and sorting
- Spring Boot Actuator health checks and endpoints
- Micrometer metrics and Prometheus registry integration
- Spring Security OAuth2 Resource Server with JWT
- Bucket4j rate limiting
- Spring Boot testing with MockMvc
- Spring Boot production configuration

## Sources Consulted
- Spring Boot 3.2.0 system requirements and GraalVM native image documentation: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/getting-started.html
- Spring Boot 3.5.15 release announcement: https://spring.io/blog/2026/06/10/spring-boot-3-5-15-available-now
- Spring Boot supported versions policy: https://github.com/spring-projects/spring-boot/wiki/Supported-Versions
- Spring Boot Actuator endpoint documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot Actuator metrics and Prometheus documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Framework MVC validation documentation: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Spring Data `PageRequest` API documentation: https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/PageRequest.html
- Spring Security authorization request matcher documentation: https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Spring Security OAuth2 Resource Server JWT documentation: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Bucket4j 8.14.0 reference documentation: https://bucket4j.com/8.14.0/toc.html
- Spring Boot common application properties documentation: https://docs.spring.io/spring-boot/appendix/application-properties/index.html

## Issues Found
- The project setup used Spring Boot `3.2.0`, which is no longer an appropriate production baseline in 2026. Updated the sample parent version to Spring Boot `3.5.15`, the current Spring Boot 3.x patch release available on June 10, 2026.
- The Actuator configuration exposed the `prometheus` endpoint without including the required `micrometer-registry-prometheus` dependency. Added the dependency because Spring Boot documents that the Prometheus endpoint requires it.
- The security example used `oauth2ResourceServer(...jwt...)` without listing the OAuth2 Resource Server dependency needed for JWT support. Added `spring-boot-starter-oauth2-resource-server`, which provides the relevant Spring Security resource server and JWT support for Spring Boot applications.
- The test examples used Spring Boot test, JUnit, MockMvc, JSON assertions, and Jackson test wiring without listing the test starter. Added `spring-boot-starter-test` with test scope.
- The controller comment tied single-constructor injection to Spring Boot 3 specifically. Updated it to state the actual behavior: a single constructor does not need `@Autowired`.
- The pagination example only capped the maximum page size. `PageRequest.of` requires a non-negative page index and a page size greater than zero, so the example could throw for negative `page` or non-positive `size` inputs. Clamped `page` to at least `0` and `size` to the range `1..100`.
- The Actuator health setting used `when_authorized`. Updated it to the documented relaxed property value `when-authorized`.
- The Spring Security CSRF comment said to disable CSRF for stateless APIs generally. Narrowed the comment to bearer-token APIs instead of cookie-authenticated browser APIs, where CSRF considerations differ.
- The Bucket4j rate limiting snippet used `Bandwidth.classic` and `Refill.intervally`, which current Bucket4j documentation has replaced with the builder-style limit API. Updated the snippet to `limit.capacity(100).refillIntervally(100, Duration.ofMinutes(1))`.

## Review Notes
The remaining examples are technically valid as illustrative snippets, but future revisions could improve the production guidance by adding a sort-field allowlist, handling `HandlerMethodValidationException` alongside `MethodArgumentNotValidException`, and noting that in-memory Bucket4j buckets are per application instance unless backed by a distributed store.
