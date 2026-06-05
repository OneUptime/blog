# Validation Summary: How to Set Up OpenTelemetry in Spring Boot with the Spring Boot Starter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java
- OpenTelemetry Spring Boot Starter
- Spring Boot
- Java
- Maven
- Gradle
- YAML configuration
- OTLP, Zipkin, and Jaeger-compatible OTLP export
- Spring JDBC, Spring MVC, RestTemplate, WebClient, Kafka, MongoDB, and R2DBC instrumentation

## Sources Consulted
- OpenTelemetry Spring Boot Starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot Starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot Starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Spring Boot Starter programmatic configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/programmatic-configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- Spring Boot observability reference: https://docs.spring.io/spring-boot/reference/actuator/observability.html
- Maven Central artifact listing for `opentelemetry-spring-boot-starter`: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-spring-boot-starter

## Issues Found
- The starter dependency used outdated alpha version `2.1.0-alpha`. Updated the examples to use the official `opentelemetry-instrumentation-bom` with version `2.28.1` and removed the explicit starter version from the dependency.
- The Maven and Gradle examples used `JdbcTemplate` later in the article without adding `spring-boot-starter-jdbc`. Added that dependency to both examples.
- The basic YAML used invalid or non-standard OpenTelemetry keys for `service.version`, OTLP headers, trace sampling probability, and metric export interval. Replaced them with `service.version` as a resource attribute, `headers: key=value`, `traces.sampler`, `traces.sampler.arg`, and `metric.export.interval`.
- The out-of-the-box instrumentation diagram listed Spring Data JPA and Redis operations, which are not listed as default starter instrumentations in the official docs. Replaced them with MongoDB and R2DBC.
- The sample application omitted `List`, `BigDecimal`, and `Payment`, and used the deprecated `JdbcTemplate.query(String, Object[], RowMapper)` style. Added imports, a `Payment` record, and changed the query call to the current varargs form.
- The manual instrumentation snippet claimed `Tracer` was injected directly by the starter. Changed it to inject the `OpenTelemetry` bean and create a `Tracer`, matching the supported API usage.
- The custom sampler example was not registered through the starter's supported programmatic customization API, missed imports, and implied head sampling can reliably detect later errors. Updated it to use `AutoConfigurationCustomizerProvider`, added required imports, and clarified that the sampler can only decide from span-start data.
- The multiple-exporter section said multiple destinations require custom configuration. Updated it to use the supported comma-separated exporter list and changed the programmatic example to advanced exporter customization via `AutoConfigurationCustomizerProvider`.
- The health indicator injected `SdkTracerProvider`, which is less reliable as a Spring bean surface for this starter. Updated it to check the `OpenTelemetry` bean.
- The batch processor tuning YAML used incorrect nested keys under `otel.sdk.trace.export.batch`. Replaced them with the documented `otel.bsp.*` properties.

## Review Notes
- Zipkin export requires the Zipkin exporter dependency on the classpath; the post now notes this but does not include a full optional dependency block.
- The manual instrumentation example still assumes application-specific methods and exception types such as `chargePaymentGateway`, `updatePaymentStatus`, and `PaymentException` exist elsewhere.
