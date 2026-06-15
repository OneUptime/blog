# Validation Summary: How to Build Custom Actuator Endpoints in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Boot Actuator
- Spring Security
- Spring MVC
- Kubernetes health probes
- YAML configuration
- curl

## Sources Consulted
- Spring Boot Reference Documentation: Actuator Endpoints - https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot Common Application Properties - https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Boot API: RestControllerEndpoint - https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/endpoint/web/annotation/RestControllerEndpoint.html
- Spring Boot API: RestTemplateBuilder - https://docs.spring.io/spring-boot/api/java/org/springframework/boot/restclient/RestTemplateBuilder.html
- Spring Security Reference: Basic Authentication - https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/basic.html
- Spring Security Reference: Authorize HttpServletRequests - https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The initial actuator exposure list included `custom`, but the examples define endpoints with IDs `application`, `cache`, `features`, and `diagnostics`. Updated the exposure list so the example endpoints are actually exposed over HTTP.
- The application endpoint used `Instant.now()` inside the read operation for `startTime`, causing the value to change on every request. Changed it to a field initialized when the endpoint bean is created.
- The application endpoint read active Spring profiles from a JVM system property, which does not reliably reflect Spring's `Environment`. Updated the example to inject `Environment` and use `getActiveProfiles()`.
- The feature endpoint imported `java.util.Set` without using it. Removed the unused import.
- The external service health indicator required a `RestTemplate` bean that the article never defined. Changed the example to create a local `RestTemplate` so the snippet is self-contained.
- The health indicator imports used older Actuator health packages. Updated the examples to the current `org.springframework.boot.health.contributor` package used by current Spring Boot documentation.
- The custom `DEGRADED` health status was returned without configuring status aggregation order. Added `management.endpoint.health.status.order` so the custom status participates in health aggregation predictably.
- The web-specific endpoint section described `@WebEndpoint` while the code used Spring MVC request mapping annotations through `@RestControllerEndpoint`. Updated the text and imports to match `@RestControllerEndpoint`.
- The Spring Security example used the deprecated no-argument `httpBasic()` DSL method. Updated it to `httpBasic(withDefaults())` and added the static import.
- The Kubernetes probe paths and ports did not match the production management configuration, which changes the base path to `/management` and management port to `9090`. Updated both liveness and readiness probes.
- The readiness health group included `redis` without adding a Redis dependency or health contributor, which can fail group membership validation. Removed `redis` from the example and normalized probe contributor IDs to `livenessstate` and `readinessstate`.

## Review Notes
- The production configuration exposes `prometheus`; Spring Boot's documentation notes that the Prometheus endpoint requires the `micrometer-registry-prometheus` dependency.
- The Spring Security configuration uses path matchers for the default `/actuator` base path. If copied together with the later `/management` base-path configuration, those matchers should be updated or replaced with Actuator `EndpointRequest` matchers.
