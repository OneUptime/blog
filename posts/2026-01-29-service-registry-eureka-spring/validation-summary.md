# Validation Summary: How to Build a Service Registry with Eureka in Spring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring Cloud Netflix Eureka Server
- Spring Cloud Netflix Eureka Client
- Spring Cloud LoadBalancer
- Spring WebClient
- RestTemplate
- Spring Boot Actuator
- Micrometer / Prometheus
- Spring Cloud Circuit Breaker / Resilience4J

## Sources Consulted
- Spring Cloud Netflix Eureka Reference: https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/
- Spring Cloud Commons LoadBalancer Reference: https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/
- Spring Cloud Project Compatibility Matrix: https://spring.io/projects/spring-cloud
- Spring Cloud 2025.0.2 Release Announcement: https://spring.io/blog/2026/04/02/spring-cloud-2025-0-2-aka-northfields-has-been-released
- Spring Cloud Circuit Breaker Project Documentation: https://spring.io/projects/spring-cloud-circuitbreaker/
- Spring Boot Actuator Metrics Reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Boot Profiles Reference: https://docs.spring.io/spring-boot/reference/features/profiles.html
- Spring Cloud Eureka Client Maven POM: https://repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-starter-netflix-eureka-client/4.1.0/spring-cloud-starter-netflix-eureka-client-4.1.0.pom

## Issues Found
- The Spring Cloud BOM used `2023.0.0`, which is no longer the current supported release train for modern Spring Boot 3.5 applications. Updated it to `2025.0.2`, which the Spring Cloud project identifies as the current Northfields service release compatible with Spring Boot 3.5.x.
- The client dependency list used `WebClient` examples but did not include Spring WebFlux. Added `spring-boot-starter-webflux` so `org.springframework.web.reactive.function.client.WebClient` and `Mono` examples compile.
- The HA profile snippets used `spring.profiles` inside `application-eureka1.yml` and `application-eureka2.yml`. Removed those entries because the files are already profile-specific and the old `spring.profiles` document activation style is not appropriate for current Spring Boot configuration.
- The custom health indicator returned a custom `DEGRADED` status while later configuring Eureka health status propagation. Eureka supports the statuses `UP`, `DOWN`, `OUT_OF_SERVICE`, and `UNKNOWN`; a custom status can be misrepresented to Eureka. Changed the degraded cache case to `Health.up()` with details so the service remains routable while exposing the cache detail.
- The Eureka health check configuration only set the health URL path. Added `eureka.client.healthcheck.enabled: true` so Spring Cloud actually propagates the Actuator health status to Eureka.
- The circuit breaker example used `CircuitBreakerFactory` without including a Spring Cloud Circuit Breaker implementation. Added the Resilience4J starter dependency required to auto-create the factory bean.
- The monitoring example exposed `/actuator/prometheus` without the Prometheus Micrometer registry dependency. Added `micrometer-registry-prometheus`.

## Review Notes
The remaining Java examples are illustrative and reference domain classes such as `User`, `CreateUserRequest`, `DatabaseConnection`, and `CacheConnection` that readers would need to provide in a real application. The Eureka client starter already brings in Spring Cloud LoadBalancer transitively in the checked 4.1.0 POM, so the `@LoadBalanced` examples are consistent with the dependency set.
