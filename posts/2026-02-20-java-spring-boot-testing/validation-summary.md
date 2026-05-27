# Validation Summary: How to Write Unit and Integration Tests for Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring MVC Test / MockMvc
- JUnit 5 / JUnit Jupiter
- Mockito
- Testcontainers
- PostgreSQL
- Spring Security Test
- Maven

## Sources Consulted
- Spring Boot Testing Reference: https://docs.spring.io/spring-boot/reference/testing/
- Spring Boot Testing Spring Boot Applications Reference: https://docs.spring.io/spring-boot/4.1/reference/testing/spring-boot-applications.html
- Spring Boot Testcontainers Reference: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Spring Framework `@DynamicPropertySource` Javadoc: https://docs.spring.io/spring-framework/docs/6.1.x/javadoc-api/org/springframework/test/context/DynamicPropertySource.html
- Spring Framework `@MockitoBean` Reference: https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html
- Spring Boot `@MockBean` Javadoc: https://docs.spring.io/spring-boot/3.4/api/java/org/springframework/boot/test/mock/mockito/MockBean.html
- Mockito JUnit Jupiter `MockitoExtension` Javadoc: https://javadoc.io/static/org.mockito/mockito-junit-jupiter/5.21.0/org.mockito.junit.jupiter/org/mockito/junit/jupiter/MockitoExtension.html
- Testcontainers JUnit Jupiter Documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers Spring Boot Guide: https://testcontainers.com/guides/testing-spring-boot-rest-api-using-testcontainers/
- Spring Security Testing Reference: https://docs.spring.io/spring-security/reference/servlet/test/index.html

## Issues Found
- The controller test used `@MockBean`, which is deprecated since Spring Boot 3.4.0 and marked for removal in Spring Boot 4.0.0. Replaced it with `@MockitoBean`, the current Spring Framework replacement for overriding an application context bean with a Mockito mock.
- The Maven snippet pinned Testcontainers `junit-jupiter` and `postgresql` to `1.20.4`, which is stale for a 2026 Spring Boot guide and unnecessary when using Spring Boot dependency management, matching the surrounding unversioned Spring Boot dependencies. Removed those explicit versions.
- The post used the non-standard capitalization `TestContainers` / `TestContainer`. Updated references to the official project name, `Testcontainers`, and clarified the PostgreSQL dependency comment as the PostgreSQL Testcontainers module.

## Review Notes
The remaining examples are intentionally partial and assume the surrounding application has the usual domain classes, controller, repository, validation annotations, exception handling, and Spring Boot dependency management in place. The examples are otherwise aligned with the official documentation for Mockito's JUnit Jupiter extension, Spring Boot test slices, `@DynamicPropertySource`, and Testcontainers' JUnit 5 extension.
