# Validation Summary: How to Trace HTTP Client Calls in Micronaut with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Micronaut Framework
- Micronaut HTTP Client
- Micronaut Tracing OpenTelemetry
- OpenTelemetry Java API and SDK
- Project Reactor
- Java
- Gradle
- YAML configuration

## Sources Consulted
- Micronaut Tracing guide: https://micronaut-projects.github.io/micronaut-tracing/latest/guide/
- Micronaut HTTP Client guide: https://guides.micronaut.io/latest/micronaut-http-client-maven-java.html
- Micronaut Core HTTP filters documentation: https://docs.micronaut.io/4.10.18/guide/
- Micronaut `@ClientFilter` API documentation: https://docs.micronaut.io/4.9.7/api/io/micronaut/http/annotation/ClientFilter.html
- Micronaut Reactor guide: https://micronaut-projects.github.io/micronaut-reactor/latest/guide/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Java `Span` API Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.25.0/io/opentelemetry/api/trace/Span.html

## Issues Found
- The setup YAML used non-standard `opentelemetry.*`, `opentelemetry.instrument.http-client`, and `tracing.enabled` properties. Updated it to Micronaut/OpenTelemetry autoconfigure properties under `otel.*`, including `otel.traces.exporter`, `otel.exporter.otlp.endpoint`, `otel.resource.attributes`, and service name configuration.
- The post implied HTTP client instrumentation is enabled by an `instrument.http-client` flag. Updated the setup so instrumentation is tied to the `micronaut-tracing-opentelemetry-http` dependency, as described by Micronaut Tracing.
- The HTTP span attribute list and manual instrumentation examples used only older OpenTelemetry semantic convention names. Updated the primary names to current stable HTTP semantic convention attributes and noted that legacy names may still be emitted depending on semconv stability settings.
- The Reactor example used `ReactorHttpClient` without listing the Reactor HTTP client and context propagation dependencies. Added `micronaut-reactor-http-client` and `io.micrometer:context-propagation`.
- Several Java snippets were missing required imports, including `java.util.List` and `java.util.Map`. Added the imports where needed.
- The retry example attempted to call `Span.getAttribute(String)`, which is not part of the OpenTelemetry Java `Span` API. Replaced the invalid attribute-read logic with span events and valid status handling.
- The reactive child-span example created a manual span but did not make it current before building the client request. Updated the snippet to make the child span current while constructing the reactive HTTP client call and to record errors before ending the span.
- The performance configuration used non-standard `opentelemetry.span-processor` and `opentelemetry.span-limits` keys. Updated it to OpenTelemetry Java autoconfigure keys represented in YAML under `otel.bsp.*` and `otel.span.*`.
- The tracing test read span attributes with string keys, but OpenTelemetry `Attributes.get` expects `AttributeKey<T>`. Updated the test to use `AttributeKey.stringKey(...)` and to tolerate legacy HTTP semantic convention names.

## Review Notes
The examples still rely on application-specific domain classes such as `Product`, `ApiResponse`, `CircuitBreaker`, and related client interfaces. That is acceptable for a tutorial, but a future runnable sample should include those supporting classes and a test endpoint.
