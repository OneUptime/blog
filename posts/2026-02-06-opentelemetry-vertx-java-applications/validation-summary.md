# Validation Summary: How to Use OpenTelemetry with Vert.x in Java Applications

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Java
- Eclipse Vert.x Core 4.x
- Vert.x Web
- Vert.x Web Client
- Vert.x Event Bus
- OpenTelemetry Java API and SDK
- OTLP trace export
- W3C trace context propagation

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry semantic conventions artifact listing on Maven Central: https://repo1.maven.org/maven2/io/opentelemetry/semconv/opentelemetry-semconv/
- Vert.x Context Javadoc: https://vertx.io/docs/4.5.27/apidocs/io/vertx/core/Context.html
- Vert.x EventBus Javadoc: https://vertx.io/docs/4.5.27/apidocs/io/vertx/core/eventbus/EventBus.html
- Vert.x RoutingContext Javadoc: https://vertx.io/docs/4.5.27/apidocs/io/vertx/ext/web/RoutingContext.html
- Vert.x HttpServerResponse Javadoc: https://vertx.io/docs/4.5.27/apidocs/io/vertx/core/http/HttpServerResponse.html
- OpenTelemetry BatchSpanProcessorBuilder Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/1.34.1/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html

## Issues Found
- The OpenTelemetry initialization snippet imported `io.opentelemetry.semconv.ResourceAttributes`, but the post did not declare a semantic-conventions dependency and the modern semconv artifact/package layout does not match that import. Changed the snippet to use stable resource attribute keys (`service.name`, `service.version`) directly.
- The threading/context explanation overstated ThreadLocal failure and implied one Vert.x context-local slot could safely represent all request/message trace state. Updated the prose to clarify that ThreadLocal context alone is insufficient across asynchronous callbacks and that HTTP requests/event bus messages should carry their own OpenTelemetry parent context.
- The tracing helper left child span context in Vert.x context after async work completed. Updated the helper to support explicit parent context propagation and to end spans through a single completion handler.
- The HTTP server stored request context in the verticle's Vert.x context, which is not request-scoped and can be overwritten by overlapping requests. Changed the example to store the request parent context in `RoutingContext`.
- The HTTP client cached a Vert.x context in the constructor and used it as the parent for all outgoing requests. Changed the client methods to accept a per-call OpenTelemetry parent context.
- The event bus helper used a Vert.x context as the parent source for producer spans and stored consumer context on the verticle context. Changed producer and consumer APIs to pass OpenTelemetry context explicitly per message.
- Several `executeBlocking(Handler<Promise<T>>)` examples used deprecated Vert.x APIs. Replaced them with the current `executeBlocking(Callable<T>)` form.
- The complete application example had compile-level issues after review, including a missing `JsonObject` import and outdated event bus handler signatures. Updated it to match the corrected helper APIs.

## Review Notes
The snippets were verified against official documentation, but they were not compiled locally because this workspace does not have `java` or `mvn` installed. The post still demonstrates manual instrumentation; in production, teams should also evaluate the OpenTelemetry Java agent or Vert.x instrumentation libraries where automatic instrumentation is acceptable.
