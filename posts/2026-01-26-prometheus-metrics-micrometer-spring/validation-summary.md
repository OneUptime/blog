# Validation Summary: How to Export Prometheus Metrics with Micrometer in Spring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot Actuator
- Micrometer
- Prometheus
- Kubernetes pod annotations for Prometheus scraping

## Sources Consulted
- Spring Boot Actuator metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Micrometer Prometheus registry reference: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html
- Micrometer meter naming reference: https://docs.micrometer.io/micrometer/reference/concepts/naming.html
- Micrometer counters reference: https://docs.micrometer.io/micrometer/reference/concepts/counters.html
- Micrometer timers and `@Timed` reference: https://docs.micrometer.io/micrometer/reference/concepts/timers.html
- Prometheus metric and label naming guide: https://prometheus.io/docs/practices/naming/
- Prometheus data model reference: https://prometheus.io/docs/concepts/data_model/

## Issues Found
- The Spring Boot Prometheus export property used the older `management.metrics.export.prometheus.enabled` structure. Updated it to the current `management.prometheus.metrics.export.enabled` structure.
- Several Micrometer examples used Prometheus-formatted names directly. Updated sample meter names to Micrometer's dot-separated convention so the Prometheus registry can convert names and append backend-specific unit/type suffixes correctly.
- The gauge example kept a `pendingTasks` field and methods that were not connected to the registered queue-size gauge. Removed the disconnected field and methods.
- The timer examples reused `operation_duration_seconds` with different tag-key sets. Updated the name and added a consistent `status` tag across all examples using that timer.
- The `@Timed` section did not mention the Spring AOP prerequisite for the `TimedAspect`. Added the `spring-boot-starter-aop` dependency before the aspect configuration.
- The custom HTTP filter reused Spring Boot's built-in `http.server.requests` meter name. Updated the text and code to use a distinct custom meter name to avoid conflicting with Spring Boot's built-in request metrics.
- The URI normalization regex replaced ordinary path segments such as `/users` with `{id}` and could partially rewrite UUID-like segments. Updated it to replace UUID and numeric ID path segments only.
- Business metric examples reused `orders_completed_total` with tag keys that differed from the earlier counter example and included an unused `Timer` import. Updated the metric name to avoid the tag-key conflict and removed the unused import.
- The `featureUsed` method accepted a `userId` parameter but did not use it, and adding it as a tag would be high cardinality. Removed the unused parameter.

## Review Notes
The post is technically valid after edits. Future revisions could mention that Spring Boot already exposes many JVM and HTTP metrics through Actuator, so custom metrics should avoid duplicating built-in meter names unless there is a deliberate migration plan.
