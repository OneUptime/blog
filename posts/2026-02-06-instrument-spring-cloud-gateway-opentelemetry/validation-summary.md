# Validation Summary: How to Instrument Spring Cloud Gateway with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- Spring Cloud Gateway
- Spring Boot application configuration
- Java / Reactor / Spring WebFlux
- OpenTelemetry Collector
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Spring Boot starter overview: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Spring Cloud Gateway global filters documentation: https://docs.enterprise.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway/global-filters.html
- Spring Cloud Gateway RequestRateLimiter documentation: https://cloud.spring.io/spring-cloud-gateway/reference/html/#the-requestratelimiter-gatewayfilter-factory
- Spring Cloud Gateway CircuitBreaker reference: https://docs.spring.io/spring-cloud/docs/2023.0.x/reference/htmlsingle/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Java instrumentation releases: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases

## Issues Found
- Clarified that `application.yml` configuration applies to the OpenTelemetry Spring Boot starter, not the Java agent. The OpenTelemetry docs state that Spring Boot configuration files configure the starter and do not work with the Java agent.
- Added `otel.exporter.otlp.protocol: grpc` to the `application.yml` example because the endpoint uses port `4317`, while OpenTelemetry Java 2.x defaults to `http/protobuf`.
- Updated the OpenTelemetry Spring Boot starter BOM version from `2.12.0` to `2.28.1`, the current release found during validation.
- Removed the explicit starter dependency version so the Maven snippet follows the official BOM-managed dependency pattern.
- Updated the rate limit filter from `HttpStatus` casting to `HttpStatusCode` and `status.value() == 429`, which is safer for Spring Framework 6 / Spring Boot 3 APIs.
- Changed the custom metrics attribute from deprecated `http.status_code` to current `http.response.status_code`.
- Updated the Collector filter processor snippet from legacy `traces.span` syntax to current `trace_conditions` syntax with `error_mode: ignore`.
- Replaced the deprecated `http.target` filter attribute with checks for `http.route` and `url.path`.
- Corrected the Collector comment from "Sample aggressively" to "Drop health check spans" because the filter processor drops matching telemetry rather than sampling it.
- Adjusted the example trace diagram and explanation so custom filters add attributes/events to the existing gateway span rather than implying that the shown code creates child spans for each filter.

## Review Notes
Spring Cloud Gateway already exposes Micrometer gateway metrics such as `spring.cloud.gateway.requests` when actuator metrics are enabled. The custom OpenTelemetry metrics example is still valid as additional route-level telemetry, but a future post could mention the built-in metrics to help readers choose between built-in Micrometer metrics and custom OTel instruments.
