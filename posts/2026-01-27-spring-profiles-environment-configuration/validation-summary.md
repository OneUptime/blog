# Validation Summary: How to Use Spring Profiles for Environment Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot
- Spring Framework (`@Profile`, `@ActiveProfiles`, `@TestConfiguration`)
- Java 17
- YAML configuration
- HikariCP (connection pool)
- Spring Security 6 (`SecurityFilterChain`, `HttpSecurity`)
- Spring Boot Actuator
- JPA / Hibernate
- H2 (in-memory database for tests)
- Docker (eclipse-temurin base image)
- Kubernetes

## Sources Consulted
- Spring Boot reference documentation — Profiles: https://docs.spring.io/spring-boot/reference/features/profiles.html
- Spring Boot reference documentation — Externalized Configuration: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Framework — `@Profile` annotation and profile expressions (Spring 5.1+): https://docs.spring.io/spring-framework/reference/core/beans/environment.html
- Spring Boot 2.4 release notes — Profile Groups introduction
- Spring Security 6 reference — CSRF configuration: https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html
- Spring Security `CsrfConfigurer` / `AbstractHttpConfigurer` API
- `SpringApplication.setAdditionalProfiles(String...)` Javadoc
- HikariCP configuration reference (maximum-pool-size, minimum-idle, connection-timeout)
- Spring Boot Actuator endpoints exposure properties
- `@ActiveProfiles` Javadoc (Spring TestContext Framework)

## Issues Found
- **`ProdSecurityConfig` used `csrf -> csrf.enable()` which does not compile.** `CsrfConfigurer` (and its parent `AbstractHttpConfigurer`) only exposes a `disable()` method — there is no `enable()` method. CSRF protection is already enabled by default in Spring Security 6, so the explicit call was both wrong and unnecessary. Fixed by removing the `.csrf(...)` line and adding a comment clarifying that CSRF protection is enabled by default. The example still illustrates the intended dev-vs-prod contrast (dev disables CSRF, prod keeps the default).

## Review Notes
- Profile expression syntax (`!`, `&`, `|`, parentheses) is correct and available since Spring Framework 5.1 / Spring Boot 2.1.
- Profile groups (`spring.profiles.group.*`) were correctly attributed to Spring Boot 2.4+.
- `application.setAdditionalProfiles(...)` is the correct API on `SpringApplication`; it adds profiles in addition to any others configured via env/CLI/properties.
- The `@Profile({"dev", "test"})` array form correctly behaves as OR.
- The Hikari connection-pool keys (`maximum-pool-size`, `minimum-idle`, `connection-timeout`), Hibernate `ddl-auto` values (`update`, `validate`, `create-drop`), and Actuator exposure include patterns (`"*"`, `health,info,metrics`) are all valid.
- The `Profile Hierarchy` example uses the same name (`dev`, `prod`) for both a profile group and an implied profile file; this works in Spring Boot — activating the group also keeps the group name itself active so `application-dev.yml` would still be loaded — but readers may want to use distinct names (e.g. `dev-env` → `common`, `dev-specific`) to avoid confusion. Not a correctness issue.
- The H2 JDBC URL `jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1` and dialect `org.hibernate.dialect.H2Dialect` are correct.
- `System.out.println` is used in the `ProfileLogger` example; a real application would normally use SLF4J, but this is stylistic, not a correctness issue.
