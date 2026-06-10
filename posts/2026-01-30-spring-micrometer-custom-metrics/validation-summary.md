# Validation Summary: How to Create Custom Metrics with Micrometer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Micrometer (metrics instrumentation library)
- Spring Boot 3.x (Spring Boot Actuator)
- Java (with `jakarta.annotation.PostConstruct`, implying Boot 3.x)
- Prometheus (registry + PromQL)
- Grafana (dashboard JSON example)

## Sources Consulted
- Spring Boot 3.0 Migration Guide: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide
- Spring Boot Actuator Metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Micrometer Timers concepts: https://docs.micrometer.io/micrometer/reference/concepts/timers.html
- Micrometer Distribution Summaries: https://docs.micrometer.io/micrometer/reference/concepts/distribution-summaries.html
- Micrometer `Timer.java` source on GitHub
- Prometheus naming convention (PrometheusNamingConvention class)
- Spring Boot issue #38583 (deprecation of `management.metrics.tags`)

## Issues Found

1. **Prometheus export property uses Spring Boot 2.x form.** The original `application.yml` used `management.metrics.export.prometheus.enabled: true`, which no longer works in Spring Boot 3.x (the code uses `jakarta.*` packages, so 3.x is clearly the target). Per the Spring Boot 3.0 migration guide, the property was relocated to `management.<product>.metrics.export.*`. Changed to `management.prometheus.metrics.export.enabled: true`.

2. **`Timer.start()` no-arg static does not exist.** The "Timer with Manual Start/Stop" example called `Timer.Sample sample = Timer.start();`. The Micrometer `Timer` class only exposes static factories `Timer.start(MeterRegistry)` and `Timer.start(Clock)` — there is no zero-arg overload, so the original snippet would not compile. Fixed by storing `meterRegistry` as a field on `OrderProcessor` and changing the call to `Timer.start(meterRegistry)`.

3. **Broken `dequeue()` example referenced an undefined `item`.** The `QueueMetrics.dequeue()` method ended with `return item;` while `item` was never declared in the method scope. Fixed by introducing a `pollFromQueue()` placeholder call and assigning its result to a local `Item item` before decrementing/returning.

4. **PromQL query for the order value distribution used the wrong metric name.** The `DistributionSummary` was built with `.baseUnit("usd")`. Micrometer's `PrometheusNamingConvention` appends the base unit to the metric name, so the exported bucket series is `order_value_usd_bucket`, not `order_value_bucket`. Updated the query to `histogram_quantile(0.5, rate(order_value_usd_bucket[5m]))`.

## Review Notes

- `management.metrics.tags.*` (used for common tags) is technically deprecated as of Spring Boot 3.2 (issue spring-projects/spring-boot#38583). It still functions, so the post is correct today, but a future revision may want to migrate or at least call out the deprecation. There is no straight 1:1 replacement that covers all meters (the suggested `management.observations.key-values` only applies to Observation-derived metrics).
- Minor stylistic inconsistency around `DistributionSummary.record(...)`: the `OrderAnalyticsService` example calls `order.getTotalAmount().doubleValue()` (BigDecimal-style) while the complete e-commerce example passes `order.getTotalAmount()` directly. Both are plausible depending on the `Order` domain type, so I left them alone, but a future edit could align them.
- The naming guidance to "end counters with total" is a Prometheus exposition convention; readers should know Micrometer also auto-appends `_total` to counter names during Prometheus export, so manually adding `.total` to the meter name plus letting Prometheus add it can lead to `_total_total` if someone is not careful. The post's examples are safe but a reader unfamiliar with this behavior may double up.
- The Grafana dashboard JSON snippet is a reasonable minimal panel definition; full Grafana panels typically include more fields (`gridPos`, `id`, etc.) but the abbreviated form is fine for a tutorial illustration.
