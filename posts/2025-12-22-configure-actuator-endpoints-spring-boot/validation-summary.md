# Validation Summary: How to Configure Actuator Endpoints in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Boot Actuator
- Spring Security
- Micrometer
- Prometheus
- Kubernetes health probes
- Maven
- Gradle

## Sources Consulted
- Spring Boot Actuator Endpoints documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot Actuator Metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Security `IpAddressAuthorizationManager` Javadoc: https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/access/IpAddressAuthorizationManager.html
- Spring Security `AuthorizationManagers` Javadoc: https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/authorization/AuthorizationManagers.html
- Spring Security Authorize HTTP Requests reference: https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html

## Issues Found
- The endpoint table said several endpoints were "Enabled by Default" with "Yes", which could be read as meaning they are available over HTTP by default. Spring Boot's current documentation distinguishes endpoint access/enabled state from HTTP exposure, and only `health` is exposed over HTTP by default. I changed the column to "Exposed over HTTP by Default" and marked `info`, `metrics`, `env`, `loggers`, `beans`, and `mappings` as not exposed by default.
- The Prometheus metrics section configured Prometheus export but did not mention the required `micrometer-registry-prometheus` dependency or expose the `prometheus` endpoint. I added Maven and Gradle dependency snippets and updated the YAML to include `prometheus` in `management.endpoints.web.exposure.include`.
- The IP-based access control example implemented a custom `IpAddressAuthorizationManager` using lower-level APIs. Spring Security now provides `IpAddressAuthorizationManager.hasIpAddress(...)` and `AuthorizationManagers.anyOf(...)` for this use case. I replaced the custom implementation with the official APIs.

## Review Notes
- The security examples use `/actuator/**` path matchers, which are correct for the default Actuator base path. If the application changes `management.endpoints.web.base-path`, Spring Boot's `EndpointRequest` matchers are generally more robust.
- The Java snippets omit imports, which is acceptable for a blog post but may require readers to import Spring Boot Actuator, Spring Security, Micrometer, JDBC, and Java utility classes in a real project.
