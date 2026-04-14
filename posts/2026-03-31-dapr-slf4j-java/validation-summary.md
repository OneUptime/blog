# Validation Summary: How to Use Dapr with SLF4J in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Java SDK (`io.dapr:dapr-sdk-springboot` v1.12.0)
- SLF4J (Simple Logging Facade for Java) with MDC
- Logback with logstash-logback-encoder v7.4
- Spring Boot (Spring MVC controllers, servlet filters)
- W3C Trace Context (`traceparent` header)

## Sources Consulted
- Maven Central for `io.dapr:dapr-sdk-springboot` — confirmed version 1.12.0 exists (https://repo1.maven.org/maven2/io/dapr/dapr-sdk-springboot/1.12.0/)
- Dapr Java SDK API reference — confirmed `DaprClient.getState(String, String, Class<T>)` returns `Mono<State<T>>` with `getValue()` method
- Maven Central for `net.logstash.logback:logstash-logback-encoder` — confirmed version 7.4 exists and `LogstashEncoder` supports `<includeMdcKeyName>` and `<customFields>`
- Dapr service invocation API reference — confirmed `dapr-caller-app-id` is a real header injected by Dapr in service-to-service calls
- W3C Trace Context specification — confirmed `traceparent` format: `{version}-{trace-id}-{parent-id}-{trace-flags}`

## Issues Found

### 1. Servlet filter MDC key mismatch with Logback configuration
**What was wrong:** The `DaprMdcFilter` stored the raw `traceparent` header value under the MDC key `traceParent`, but the Logback configuration referenced `traceId` and `spanId` (parsed values). Using the filter alone would not populate the MDC keys expected by the Logback configuration, resulting in empty trace fields in log output.

**What was changed:** Updated the filter to parse the `traceparent` header into `traceId` and `spanId` MDC keys (matching the controller example and the Logback configuration), instead of storing the raw value.

### 2. Unreferenced `daprRequestId` MDC key in Logback configuration
**What was wrong:** The Logback configuration included `<includeMdcKeyName>daprRequestId</includeMdcKeyName>`, but no code in the post ever sets an MDC key called `daprRequestId`. This would confuse readers into expecting a field that never appears in their logs.

**What was changed:** Removed the `<includeMdcKeyName>daprRequestId</includeMdcKeyName>` line from the Logback configuration.

## Review Notes
- The controller example and the servlet filter example serve the same purpose (populating MDC from Dapr headers). The post presents them as separate approaches, which is fine, but readers should understand they are alternatives — using both simultaneously would result in the controller's `populateMdcFromDaprHeaders` call being redundant when the filter is active.
- The post uses `dapr-sdk-springboot` v1.12.0, which is valid but not the latest. The latest release candidates are around v1.17.x. This is acceptable for a tutorial but readers should check for newer stable versions.
- The Java code examples omit some imports (Spring annotations, `ResponseEntity`, `Map`, servlet API classes) and boilerplate (constructor injection for `DaprClient`). This is standard practice for blog tutorials and not a technical error.
- The `logstash-logback-encoder` v7.4 is valid but the latest is v9.0. Readers may want to use a newer version.
