# Validation Summary: How to Use Micrometer for Metrics in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide (hands-on instrumentation guide with extensive code examples)

## Technologies Covered
- Java
- Spring Boot 3.2
- Spring Boot Actuator
- Micrometer (core API, Prometheus registry, OTLP registry)
- Prometheus
- OneUptime (OTLP ingestion)
- Maven (pom.xml dependency configuration)
- YAML (application.yml configuration)

## Sources Consulted
- Spring Boot 3.2 Actuator reference documentation — https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/actuator.html (verified Prometheus/OTLP export property names, endpoint exposure config, `/actuator/prometheus` path)
- Micrometer Timers concepts documentation — https://docs.micrometer.io/micrometer/reference/concepts/timers.html (verified `Timer.builder`, `recordCallable`, `Timer.start`/`sample.stop`)
- Micrometer Counter / Gauge / DistributionSummary concept docs (builder APIs, percentile/histogram and SLO methods)

## Issues Found
No technical issues found.

## Review Notes
- **Spring Boot 3.2 property names are correct.** The post uses `management.prometheus.metrics.export.enabled`, `management.otlp.metrics.export.enabled` / `url`, `management.endpoints.web.exposure.include`, and `management.endpoint.prometheus.enabled` — all of which match the Spring Boot 3.x property layout (these moved from the older 2.x `management.metrics.export.*` form, so the post is current).
- **Micrometer APIs are current and non-deprecated.** `serviceLevelObjectives(...)` is used rather than the deprecated `sla(...)`. `publishPercentiles`, `publishPercentileHistogram`, `minimumExpectedValue`/`maximumExpectedValue`, `recordCallable`, `Timer.start`/`Timer.Sample.stop`, `Gauge.builder` (both the `(name, obj, ToDoubleFunction)` and `(name, Supplier<Number>)` overloads), `DistributionSummary.builder`, and the `@Timed` annotation with `TimedAspect` bean registration are all used correctly.
- **MeterFilter usage is accurate.** `MeterFilter.deny(Predicate)`, `MeterFilter.renameTag(prefix, from, to)`, and `MeterFilter.maximumAllowableTags(prefix, tagKey, max, onMax)` signatures are correct, as is `MeterRegistryCustomizer` from `org.springframework.boot.actuate.autoconfigure.metrics`.
- **Minor real-world nuance (not an error):** The example counter is named `orders.placed.total` and the sample Prometheus scrape shows `orders_placed_total`. Depending on the Prometheus client/registry version, Micrometer may append a `_total` suffix to counters; naming a counter with an explicit `.total` can occasionally produce a doubled suffix. The displayed output is reasonable and the guidance is sound, so no change was made — but readers following strict Prometheus conventions sometimes prefer naming the counter `orders.placed` and letting the registry add `_total`.
- The code samples are illustrative service skeletons (with placeholder supporting classes) rather than a fully runnable project, which is appropriate for the tutorial format and clearly presented as such.
