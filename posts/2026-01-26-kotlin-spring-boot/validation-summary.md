# Validation Summary: How to Use Kotlin with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin
- Spring Boot
- Spring MVC
- Spring WebFlux
- Spring Data JPA
- Spring Data R2DBC
- Hibernate
- Jakarta Bean Validation
- Spring Security Crypto
- Gradle Kotlin DSL
- PostgreSQL
- Testcontainers
- MockK
- JUnit 5

## Sources Consulted
- Spring Boot Kotlin support documentation: https://docs.spring.io/spring-boot/reference/features/kotlin.html
- Spring Boot CLI documentation: https://docs.spring.io/spring-boot/cli/using-the-cli.html
- Spring Boot Testcontainers documentation: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Spring Framework / Spring Data Kotlin coroutine documentation: https://docs.spring.io/spring-data/relational/reference/kotlin/coroutines.html
- Kotlin all-open compiler plugin documentation: https://kotlinlang.org/docs/all-open-plugin.html
- Kotlin no-arg/JPA compiler plugin documentation: https://kotlinlang.org/docs/no-arg-plugin.html
- Kotlin Gradle compiler options documentation: https://kotlinlang.org/docs/gradle-compiler-options.html
- Spring Security Crypto module documentation: https://docs.spring.io/spring-security/reference/features/integrations/cryptography.html
- Spring Security password storage documentation: https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html
- Testcontainers JUnit 5 documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers PostgreSQL module documentation: https://java.testcontainers.org/modules/databases/postgres/

## Issues Found
- The Gradle build used lazy JPA associations but did not open `@Entity` classes for Hibernate proxies. Added the Kotlin `plugin.allopen` plugin and an `allOpen` block for JPA annotations.
- The service injected `PasswordEncoder`, but the build did not include Spring Security Crypto and no encoder bean was defined. Added `spring-security-crypto` and a minimal `PasswordConfig` with `BCryptPasswordEncoder`.
- The tests used MockK and Testcontainers without declaring their dependencies. Added `io.mockk:mockk`, `org.testcontainers:junit-jupiter`, and `org.testcontainers:postgresql`.
- The coroutine/WebFlux section referenced an undefined `UserCoroutineRepository` and implied non-blocking database access while only showing blocking JPA dependencies. Added R2DBC dependencies, `kotlinx-coroutines-reactive`, a Spring Data R2DBC entity, and a `CoroutineCrudRepository` example.
- The coroutine service called `toResponse()` from another snippet while the original extension function was `private`. Made the JPA mapping extension reusable and added a separate R2DBC mapping extension in the async service.
- The `@ConfigurationPropertiesScan` example omitted required imports. Added the imports to the snippet.
- A controller comment said a suspend function handles "one request at a time," which could be read as a concurrency limitation. Reworded it to describe returning a single result without blocking threads.

## Review Notes
- The post pins Spring Boot `3.2.0` and Kotlin `1.9.20`, which are older than the currently documented stable releases as of 2026-06-13. The examples were validated for the pinned stack where applicable; a future refresh could update the build to current Spring Boot and Kotlin versions.
- Kotlin's `kotlinOptions {}` DSL is valid for the pinned Kotlin 1.9.x build, but Kotlin 2.x documentation now recommends migrating to `compilerOptions {}`.
