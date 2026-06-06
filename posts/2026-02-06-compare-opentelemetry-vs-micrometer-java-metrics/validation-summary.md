# Validation Summary: How to Compare OpenTelemetry vs Micrometer for Java Metrics

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Java
- OpenTelemetry Java API and metrics SDK concepts
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- Micrometer
- Spring Boot Actuator metrics
- Prometheus and OTLP metric export

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java API Javadocs for metrics instruments and builders: https://javadoc.io/doc/io.opentelemetry/opentelemetry-api
- OpenTelemetry Spring Boot starter documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java agent supported libraries documentation: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- Micrometer counters documentation: https://docs.micrometer.io/micrometer/reference/concepts/counters.html
- Micrometer timers documentation: https://docs.micrometer.io/micrometer/reference/concepts/timers.html
- Micrometer reference documentation: https://docs.micrometer.io/micrometer/reference/index.html
- Spring Boot Actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html

## Issues Found
- The introduction said both libraries provide timers. OpenTelemetry Metrics does not have a Timer instrument like Micrometer, so the wording was changed to "duration measurements."
- The OpenTelemetry counter example used `AttributeKey` without importing it. Added the missing import.
- The Micrometer timer example referenced `MeterRegistry` and `Duration` without imports, and its comment mentioned try-with-resources while the code used `Timer.record`. Added the missing imports and corrected the comment.
- The OpenTelemetry histogram example referenced `Meter`, `GlobalOpenTelemetry`, `Attributes`, `AttributeKey`, and `Arrays` without imports. Added the missing imports.
- The OpenTelemetry Spring Boot starter Maven example used an old inline alpha version. Updated it to the documented pattern of importing `opentelemetry-instrumentation-bom` and omitting the dependency version from the starter dependency.
- The post stated that the OpenTelemetry Java agent automatically bridges Micrometer metrics. Official Java agent and starter documentation list Micrometer instrumentation as disabled by default, so the bridge wording now says it works when `otel.instrumentation.micrometer.enabled=true` is set.
- The feature table described OpenTelemetry gauge support as `UpDownCounter`. OpenTelemetry Java has gauge instruments, while UpDownCounter is a separate instrument type, so the table now says "Yes."
- The backend comparison said OpenTelemetry exports "Via OTLP (any backend)." Updated it to "Via exporters such as OTLP and Prometheus" to avoid overstating backend support.

## Review Notes
The code examples remain illustrative snippets and still assume application-specific types and methods such as `Order`, `Payment`, `PaymentResult`, `doProcess`, and `gateway`. The OpenTelemetry Spring Boot starter and instrumentation versions are current as of the review date, but this area changes frequently and should be rechecked before future publication updates.
