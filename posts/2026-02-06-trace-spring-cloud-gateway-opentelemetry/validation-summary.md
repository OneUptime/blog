# Validation Summary: How to Trace Spring Cloud Gateway Requests with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java API
- Spring Cloud Gateway
- Spring WebFlux / Reactor
- Spring Cloud LoadBalancer
- Spring Cloud CircuitBreaker
- Resilience4j
- Maven
- YAML configuration

## Sources Consulted
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry general SDK configuration and sampler settings: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- Spring Cloud Gateway reference documentation: https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/
- Spring Cloud Gateway route metadata documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/route-metadata-configuration.html
- Spring Cloud Gateway `ServerWebExchangeUtils` Javadoc: https://javadoc.io/static/org.springframework.cloud/spring-cloud-gateway-core/2.2.0.RELEASE/org/springframework/cloud/gateway/support/ServerWebExchangeUtils.html
- Spring Cloud CircuitBreaker Resilience4j documentation: https://docs.enterprise.spring.io/spring-cloud-circuitbreaker/reference/spring-cloud-circuitbreaker-resilience4j.html

## Issues Found
- The dependency snippet pinned older OpenTelemetry API and instrumentation annotation versions, and the annotation dependency was not used by the examples. Updated the snippet to use the current OpenTelemetry BOM and only include `opentelemetry-api` for manual instrumentation.
- The `application.yml` snippet used `otel.traces.sampler.probability` and related nested keys that are not valid OpenTelemetry Java agent configuration. Replaced it with Java agent environment variables including `OTEL_TRACES_SAMPLER`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` for port 4317.
- The automatic instrumentation section claimed route matching internals and built-in filters are automatically traced. OpenTelemetry Java instrumentation supports Spring Cloud Gateway route metadata such as `http.route`, but separate route-matching and filter spans require manual instrumentation. Updated the explanation.
- The filter examples read the route ID from a string literal for `gatewayPredicateRouteAttr`. Updated them to use `ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR` and the Spring Cloud Gateway `Route` object.
- The route-specific span example used a synchronous `Scope` pattern around a reactive chain, which would close before asynchronous downstream work completed. Replaced it with an explicit child span parent and ended the span in `doFinally`.
- The load-balancer tracing example used `Span.current()` inside a post-chain callback, where the current span may not be the same as at filter entry. Updated it to capture the span before invoking the chain and reuse it in the callback.
- The circuit breaker section did not mention the required `spring-cloud-starter-circuitbreaker-reactor-resilience4j` dependency for the gateway `CircuitBreaker` filter. Added the requirement.
- The circuit breaker YAML name did not match the code's lookup convention. Updated the example name to `flaky-serviceCircuitBreaker`.
- The visualization showed a `TracingEnrichmentFilter` span even though that example only enriches the current span. Updated the diagram label to attributes and events.
- The sampling example used invalid YAML keys and claimed errors could always be sampled with a head sampler. Replaced it with `parentbased_traceidratio` environment variables and noted that keeping all error traces requires tail sampling.

## Review Notes
The Java examples are illustrative snippets rather than a complete runnable project. A future improvement would be to add a small sample application with Maven dependency management for the Spring Cloud BOM and a test or smoke run against a local OTLP collector.
