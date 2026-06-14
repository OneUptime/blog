# Validation Summary: How to Create Custom Micrometer Metrics in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot Actuator
- Micrometer
- Prometheus metrics export
- Spring AOP
- TimedAspect

## Sources Consulted
- Spring Boot Actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Micrometer counters documentation: https://docs.micrometer.io/micrometer/reference/concepts/counters.html
- Micrometer timers documentation: https://docs.micrometer.io/micrometer/reference/concepts/timers.html
- Micrometer distribution summaries documentation: https://docs.micrometer.io/micrometer/reference/concepts/distribution-summaries.html
- Spring Framework AOP proxying documentation: https://docs.spring.io/spring-framework/reference/core/aop/proxying.html
- Spring Boot AOP starter metadata: https://central.sonatype.com/artifact/org.springframework.boot/spring-boot-starter-aop

## Issues Found
- The Prometheus export configuration used the older Spring Boot 2.x property path `management.metrics.export.prometheus.enabled`. Updated it to the current Spring Boot 3+ property path `management.prometheus.metrics.export.enabled`.
- The dependencies omitted `spring-boot-starter-aop`, which is needed for the `TimedAspect`-based `@Timed` example to work with Spring AOP. Added the starter dependency.
- The `@Timed` example annotated a private method that was called from another method in the same class. Spring AOP cannot advise private methods and self-invocation bypasses proxy advice, so that method would not be timed as implied. Removed the incorrect annotation from the private helper method.
- The metrics architecture diagram labeled the Prometheus scrape endpoint as `/metrics endpoint`. Spring Boot exposes Prometheus metrics at `/actuator/prometheus` when the endpoint is available and exposed, so the diagram label was corrected.
- The distribution summary section said summaries can track response times. Micrometer recommends using `Timer` for time durations and `DistributionSummary` for non-time values, so the wording was corrected to response sizes.
- The histogram bucket example comments described service-level objective boundaries as percentile targets. Updated the comments to describe them as SLO boundaries.

## Review Notes
- The examples are illustrative and omit surrounding domain classes such as `Order`, `OrderRequest`, `PaymentException`, `User`, and `RegistrationRequest`.
- Dynamic tag values in the examples are bounded-looking values such as payment method, region, reason, operation, and success. The post correctly warns against unbounded values such as user IDs and order IDs.
