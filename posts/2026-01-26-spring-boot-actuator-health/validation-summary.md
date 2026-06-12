# Validation Summary: How to Configure Spring Boot Actuator for Health Checks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Java
- Spring Boot
- Spring Boot Actuator
- Spring Security
- Spring Data Redis
- JDBC / DataSource health checks
- Kubernetes liveness, readiness, and startup probes
- Maven and Gradle dependency configuration

## Sources Consulted
- Spring Boot Actuator endpoint reference: https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
- Spring Boot current Actuator endpoint reference: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Security deprecated API list for `HttpSecurity.httpBasic()`: https://docs.spring.io/spring-security/site/docs/6.3.7/api/deprecated-list.html
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes liveness, readiness, and startup probe concepts: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post used `when_authorized` for `management.endpoint.health.show-details` and `show-components`. Updated examples and diagrams to the documented `when-authorized` value.
- The custom health indicator snippets used `@Value` but omitted the required `org.springframework.beans.factory.annotation.Value` import. Added the import where needed.
- The Redis health indicator included an unused `RedisConnectionFactory` import. Removed it.
- The custom `DEGRADED` status example did not explain that custom statuses should be included in health status ordering for aggregate responses. Added the required `management.endpoint.health.status.order` configuration.
- The health group diagram omitted the default `/actuator` base path. Updated the paths to `/actuator/health`, `/actuator/health/liveness`, and `/actuator/health/readiness`.
- The Kubernetes probe support property was shown under `management.health.probes.enabled`, but current Spring Boot documentation uses `management.endpoint.health.probes.enabled`. Updated the YAML nesting.
- The Spring Security example used deprecated `httpBasic()`. Updated it to `httpBasic(withDefaults())` and added the required static import.
- The separate management port example bound Actuator to `127.0.0.1` while showing Kubernetes probing it. In Kubernetes, probes target the pod network by default, so a localhost-only bind is misleading. Updated the example to bind on the pod network and recommend NetworkPolicy/firewall restrictions.
- The unit test used `@InjectMocks` for a constructor requiring a configured URL string, which would not reliably create the health indicator with the URL used in the mocks. Replaced it with explicit construction in `@BeforeEach`.

## Review Notes
- The examples are most directly aligned with Spring Boot 3.x / Spring Security 6.x APIs. Spring Boot 4.x has package changes for some health contributor APIs, so a future version-specific update may be useful if the blog intends to target Spring Boot 4 explicitly.
- The Prometheus endpoint example assumes the Prometheus registry dependency is present.
