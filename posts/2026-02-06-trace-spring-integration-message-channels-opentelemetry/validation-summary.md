# Validation Summary: How to Trace Spring Integration Message Channels with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Spring Integration
- Spring Boot
- OpenTelemetry Java
- OpenTelemetry Spring Boot starter
- Java
- Maven
- YAML configuration

## Sources Consulted
- Spring Integration channel interceptors reference: https://docs.spring.io/spring-integration/reference/channel/interceptors.html
- Spring Integration `@GlobalChannelInterceptor` Javadoc: https://docs.spring.io/spring-integration/api/org/springframework/integration/config/GlobalChannelInterceptor.html
- Spring Framework `ChannelInterceptor` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/messaging/support/ChannelInterceptor.html
- Spring Framework `MessageHeaders` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/messaging/MessageHeaders.html
- Spring Integration annotation support reference: https://docs.spring.io/spring-integration/reference/configuration/annotations.html
- Spring Integration `@Gateway` Javadoc: https://docs.spring.io/spring-integration/docs/current/api/org/springframework/integration/annotation/Gateway.html
- OpenTelemetry Spring Boot starter getting started guide: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry `@WithSpan` Javadoc: https://javadoc.io/static/io.opentelemetry.instrumentation/opentelemetry-instrumentation-annotations/2.17.1/io/opentelemetry/instrumentation/annotations/WithSpan.html

## Issues Found
- The dependency snippet used only `opentelemetry-api`, which does not configure an SDK/exporter by itself. Replaced it with `opentelemetry-spring-boot-starter` and aligned the annotation dependency version with the current OpenTelemetry instrumentation BOM version shown in official docs.
- The OpenTelemetry YAML implied Spring Boot configuration support without naming the starter and used the gRPC default port while not specifying a protocol. Updated the text to say the configuration is for the Spring Boot starter and set `protocol: http/protobuf` with endpoint `http://localhost:4318`.
- The channel interceptor imported `org.springframework.integration.channel.interceptor.ChannelInterceptor`, but current Spring messaging uses `org.springframework.messaging.support.ChannelInterceptor`. Updated the import.
- The interceptor implemented `preReceive` with the wrong return type. Current `ChannelInterceptor.preReceive` returns `boolean`, not `Message<?>`. Updated the method to return `true`.
- The interceptor mutated `MessageHeaders` with `message.getHeaders().put(...)`, but `MessageHeaders` are immutable and throw `UnsupportedOperationException` for mutating operations. Replaced this with `MessageBuilder.fromMessage(...).setHeader(...)`.
- The receive span was created before the received message was available and leaked a `Scope` by calling `span.makeCurrent()` without closing it. Moved receive span creation to `postReceive`, where the message and propagated context are available.
- Several snippets used `MessageBuilder` but did not import it. Added the missing imports to the service activator and aggregator examples.
- The global interceptor configuration used `Tracer` without importing it. Added the missing import.
- Several OpenTelemetry span attributes passed domain objects or enums directly. Converted IDs and priority values with `String.valueOf(...)` so they match OpenTelemetry Java attribute value types.
- The transformer set a non-standard string header name `"content-type"`. Updated it to use `MessageHeaders.CONTENT_TYPE` and `MimeTypeUtils.APPLICATION_JSON`.
- The Java DSL flow example reused methods that were already registered as annotated endpoints, which could create duplicate consumers, and it routed a JSON payload through a router that expected an `Order`. Replaced the snippet with channel bean definitions for the annotated components and added missing channels referenced by the examples.
- The trace visualization described one fixed complete span hierarchy even though receive callbacks only apply to pollable channels and the examples cover separate flow patterns. Updated the wording and diagram to describe possible span relationships instead of a guaranteed single trace tree.

## Review Notes
The examples remain illustrative and still depend on application-specific domain classes such as `Order`, `ProcessedOrder`, `OrderItem`, `OrderService`, `AggregatedOrder`, and `XmlToJsonConverter`. The `@WithSpan` annotations require OpenTelemetry auto-instrumentation support, such as the Java agent or Spring Boot starter instrumentation, to create spans.
