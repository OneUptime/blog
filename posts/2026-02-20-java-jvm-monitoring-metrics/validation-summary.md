# Validation Summary: How to Monitor JVM Performance with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Java
- Spring Boot Actuator
- Micrometer
- Prometheus
- PromQL
- Kubernetes service discovery
- Grafana
- Alertmanager

## Sources Consulted
- Spring Boot Actuator metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Micrometer JVM metrics reference: https://docs.micrometer.io/micrometer/reference/reference/jvm.html
- Micrometer Prometheus registry reference: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html
- Micrometer histograms and percentiles reference: https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Spring Boot Prometheus export property used the older `management.metrics.export.prometheus.enabled` path. Updated it to the current `management.prometheus.metrics.export.enabled` property documented by Spring Boot.
- The cache gauge cast assumed every cache was a `ConcurrentMapCache`, which could throw `ClassCastException` with another cache implementation. Changed the example to check `instanceof ConcurrentMapCache` before reading the native map size.
- The order counter comment said it incremented a counter with a status tag, but the configured counter only has a `type` tag. Updated the comment to match the code.
- The Kubernetes relabeling example replaced `__address__` with only the annotated port, producing an invalid scrape target. Updated it to combine the discovered host with the `prometheus.io/port` annotation.
- The heap usage query and alert divided per memory-pool series instead of calculating heap usage per instance. Updated both expressions to use `sum by (instance)` for used and max heap bytes.
- The `histogram_quantile` query operated directly on bucket rates without preserving the `le` label through aggregation. Updated it to use `sum by (le) (rate(..._bucket[5m]))`, matching Prometheus histogram guidance.

## Review Notes
- The dependency examples are correct for a Spring Boot application using Micrometer's current Prometheus registry artifact.
- The post does not pin Spring Boot or Micrometer versions; the fixes align the examples with current Spring Boot documentation as of 2026-05-27.
