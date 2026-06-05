# Validation Summary: How to Monitor Apache Camel Routes with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Camel
- Apache Camel Spring Boot
- Apache Camel OpenTelemetry
- OpenTelemetry Java SDK
- OpenTelemetry OTLP exporter
- Java
- Maven
- JUnit 5
- Camel Enterprise Integration Patterns

## Sources Consulted
- Apache Camel OpenTelemetry component documentation: https://camel.apache.org/components/4.14.x/others/opentelemetry.html
- Apache Camel EventNotifier documentation: https://camel.apache.org/manual/event-notifier.html
- Apache Camel Exception Clause documentation: https://camel.apache.org/manual/exception-clause.html
- Apache Camel Spring Boot component starter list: https://camel.apache.org/camel-spring-boot/4.14.x/list.html
- Maven Central artifact metadata for Apache Camel 4.14.0 and OpenTelemetry 1.53.0: https://repo1.maven.org/maven2/
- OpenTelemetry Java SDK testing artifact metadata: https://repo1.maven.org/maven2/io/opentelemetry/opentelemetry-sdk-testing/1.53.0/

## Issues Found
- The post used Apache Camel 4.3.0 APIs while configuring tracer options that are not available on that version. Updated Camel dependencies to 4.14.0 and kept the documented `setTraceProcessors(true)` option.
- The Camel OpenTelemetry configuration called `setOpenTelemetry(...)`, `setTraceSteps(...)`, and `setTraceTemplates(...)`, which do not match the Camel `OpenTelemetryTracer` API. Replaced this with `setTracer(...)`, `setTraceProcessors(true)`, and `init(camelContext)`.
- The OpenTelemetry resource configuration imported `ResourceAttributes` from an incorrect package for the shown dependencies. Replaced it with explicit OpenTelemetry `AttributeKey` constants for `service.name` and `service.version`.
- The Spring Boot dependency list used plain Camel component artifacts for OpenTelemetry, HTTP, and Jackson. Updated them to the corresponding Camel Spring Boot starters for the Spring Boot tutorial context.
- The testing snippet used `OpenTelemetryExtension` without listing `opentelemetry-sdk-testing`. Added the missing test dependency and showed how to override the test `OpenTelemetry` bean.
- The simple route test expected manual `validateOrder` and `enrichOrder` spans, but the route did not invoke the custom processor that creates them. Added the custom processor bean call to the route.
- The custom processor read `body.length()` before checking for `null`. Moved the length attribute after the null and empty-body check.
- Dynamic HTTP endpoint examples used `.to(...)` with Simple header expressions in the URI. Replaced those with `.toD(...)` for dynamic endpoint URIs.
- The order service HTTP example mixed a target-service query string with Camel endpoint options. Moved the dynamic HTTP query to the `CamelHttpQuery` header.
- The external API multicast route did not aggregate parallel responses before calling the response aggregator bean. Added `GroupedBodyAggregationStrategy`.
- The event notifier counted failures by checking `isFailed()` on `ExchangeCompletedEvent`, but Camel emits separate failed exchange events. Updated it to count `ExchangeCompletedEvent` as success and `ExchangeFailedEvent` as failure.
- The HTTP tracing claim said HTTP client spans automatically include request and response details. Clarified that Camel tracing records outgoing HTTP endpoint calls and that Java agent or HTTP client instrumentation is needed for low-level HTTP client spans.
- The async tracing best practice was too broad. Narrowed it to traced exchanges carrying context across asynchronous route boundaries.

## Review Notes
- The tutorial now aligns with Camel 4.14.0 and OpenTelemetry 1.53.0. Future updates should re-check Camel OpenTelemetry options because the component documentation and OpenTelemetry semantic convention artifacts evolve over time.
