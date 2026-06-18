# Validation Summary: How to Build Health Probes for Kubernetes in Spring Boot

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring Boot Actuator
- Spring Data Redis
- JDBC
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Deployments

## Sources Consulted
- Spring Boot Actuator Endpoints documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot Graceful Shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot 4 API documentation for health contributor packages: https://docs.spring.io/spring-boot/api/java/
- Spring Boot blog on liveness and readiness probes: https://spring.io/blog/2020/03/25/liveness-and-readiness-probes-with-spring-boot/
- Kubernetes documentation for liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Spring Data Redis RedisConnectionCommands API: https://docs.spring.io/spring-data/redis/reference/api/java/org/springframework/data/redis/connection/RedisConnectionCommands.html

## Issues Found
- The custom `CustomHealthConfig` example manually registered liveness and readiness health indicator beans. Spring Boot Actuator already creates the probe health indicators and health groups when probes are enabled, and custom bean names would not be the standard probe group configuration. Replaced the code block with guidance to use the built-in probe indicators and configure health groups.
- The custom health indicator imports used Spring Boot 3.x and earlier packages. Updated the code examples to Spring Boot 4 health contributor packages and added a version note for Spring Boot 3.x and earlier.
- The graceful shutdown example used a `ContextClosedEvent` listener with `Thread.sleep()` to mark readiness and wait for in-flight requests. Current Spring Boot graceful shutdown documentation says Spring Boot updates readiness to `REFUSING_TRAFFIC` during graceful shutdown and manages the shutdown phase timeout. Replaced the custom listener with the documented configuration-based approach.
- The shutdown pitfall claimed Kubernetes will keep sending traffic during shutdown. Adjusted this to "may keep sending traffic" because routing behavior depends on readiness propagation and the Kubernetes/networking setup.

## Review Notes
- The Kubernetes probe YAML structure and fields are valid.
- The Actuator probe endpoint paths match Spring Boot's documented liveness and readiness health groups.
- The Redis `ping()` example is consistent with Spring Data Redis, where `ping()` usually returns `PONG`.
- The readiness group includes shared external dependencies (`db`, `redis`, `diskSpace`). This is technically valid, but Spring Boot documentation recommends making that decision carefully because shared dependency outages can remove all application instances from service.
