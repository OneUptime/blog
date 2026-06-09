# Validation Summary: How to Configure Kotlin DSL in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin 1.9.21
- Spring Boot 3.2.0
- Spring Framework 6.x
- Spring Security 6.x (servlet + WebFlux)
- Spring WebFlux Router DSL (coRouter, functional endpoints)
- Spring Bean Definition DSL (`beans { }`)
- Gradle Kotlin DSL (`build.gradle.kts`, `settings.gradle.kts`)
- Spring Dependency Management Plugin 1.1.4
- Jackson Kotlin module
- Reactor Kotlin extensions
- Kotlin Coroutines / kotlinx-coroutines-reactor
- MockK testing framework
- JUnit 5 (Jupiter)
- Spring `WebTestClient`
- Spring Security Method Security (`@PreAuthorize`, `@PostFilter`, `@EnableMethodSecurity`)

## Sources Consulted
- Spring Framework reference docs — Kotlin Bean Definition DSL: https://docs.spring.io/spring-framework/reference/languages/kotlin/bean-definition-dsl.html
- Spring Framework reference docs — Functional Bean Registration in Kotlin: https://docs.spring.io/spring-framework/reference/core/beans/java/instantiating-container.html
- Spring Framework Javadoc — `org.springframework.http.client.SimpleClientHttpRequestFactory` (Spring 6.x)
- Spring WebFlux Router DSL / `coRouter`: https://docs.spring.io/spring-framework/reference/web/webflux-functional.html
- Spring Security Kotlin DSL (servlet): https://docs.spring.io/spring-security/reference/servlet/configuration/kotlin.html
- Spring Security Kotlin DSL (reactive / WebFlux): https://docs.spring.io/spring-security/reference/reactive/configuration/webflux.html
- Spring Boot 3.2.0 release notes and Gradle plugin documentation
- Kotlin Gradle DSL documentation: https://kotlinlang.org/docs/gradle.html
- MockK documentation: https://mockk.io/
- Spring Boot Reactive Error Handling — `DefaultErrorAttributes` / `ErrorAttributeOptions` (package `org.springframework.boot.web.error` / `org.springframework.boot.web.reactive.error`)

## Issues Found
- **`SimpleClientHttpRequestFactory` timeout API used the wrong overload.** The original code called `setConnectTimeout(Duration.ofSeconds(5))` and `setReadTimeout(Duration.ofSeconds(10))`. In Spring Framework 6.x (used by Spring Boot 3.2.0), `SimpleClientHttpRequestFactory` only exposes `setConnectTimeout(int)` and `setReadTimeout(int)` (milliseconds) — there are no `Duration` overloads, so the snippet would not compile. Replaced the calls with the integer millisecond values (`5000` / `10000`), added the missing `import org.springframework.http.client.SimpleClientHttpRequestFactory`, and removed the now-unused `java.time.Duration` import.

## Review Notes
- The post uses `kotlinOptions { ... }` inside `tasks.withType<KotlinCompile>`. This still works correctly in Kotlin 1.9.21 but is deprecated in favor of `compilerOptions { ... }` in Kotlin 2.0+. Worth flagging in a future revision if the post is updated for Kotlin 2.x.
- The `beans { }` DSL was introduced in Spring Framework 5.0; the claim in the post is correct.
- `addFilterBefore<UsernamePasswordAuthenticationFilter>(...)` is the correct reified-type API exposed by the Spring Security Kotlin DSL (`HttpSecurityDsl`).
- The `EmailService` interface defined in the beans configuration declares `send(...)` while the MockK test stubs `sendWelcomeEmail(...)`. These are independent illustrative snippets, but a real implementation would need to keep these signatures aligned.
- The integration test references a `securityBeans` initializer that is not defined elsewhere in the post — clearly a placeholder mirroring `appBeans`. Not a technical error, but readers will need to provide their own equivalent.
- The handler snippets in the WebFlux router section assume domain classes (`User`, `UserService`, `ProductHandler`, `ApiHandler`, `JwtAuthenticationFilter`, `jwtService`, `CustomAuthenticationEntryPoint`, `CustomAccessDeniedHandler`, `UrlBasedCorsConfigurationSource`, `CorsConfiguration`, `ExpensiveResourceService`, `DefaultCacheManager`, `DatabaseConnectionFactory`, `ResourcePool`, `UserRepositoryImpl`, `NotificationConfig`, `ValidationException`, `ResourceNotFoundException`, `AuthenticationException`) that are intentionally not shown — fine for an illustrative guide.
- `@PostFilter` on a `suspend` function returning `List<Resource>` works under Spring Security 6 method security but adds non-trivial reactive considerations; the example is conceptually fine but readers should be aware.
