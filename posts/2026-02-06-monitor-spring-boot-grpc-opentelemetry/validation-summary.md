# Validation Summary: How to Monitor Spring Boot gRPC Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java instrumentation
- OpenTelemetry Spring Boot starter
- Spring Boot 3
- grpc-spring-boot-starter
- gRPC Java
- Protocol Buffers
- Micrometer metrics
- OTLP exporting

## Sources Consulted
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter API extension documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/api/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry gRPC instrumentation Javadocs for `GrpcTelemetryBuilder`: https://javadoc.io/doc/io.opentelemetry.instrumentation/opentelemetry-grpc-1.6/
- Maven Central metadata for `opentelemetry-instrumentation-bom`, `opentelemetry-instrumentation-bom-alpha`, `opentelemetry-grpc-1.6`, and `opentelemetry-spring-boot-starter`: https://repo1.maven.org/maven2/io/opentelemetry/instrumentation/
- grpc-spring project README and version documentation: https://github.com/grpc-ecosystem/grpc-spring and https://grpc-ecosystem.github.io/grpc-spring/en/versions.html
- gRPC Java `StreamObserver` Javadoc: https://grpc.github.io/grpc-java/javadoc/io/grpc/stub/StreamObserver.html

## Issues Found
- The dependency snippet used `grpc-spring-boot-starter` 2.15.0 with Spring Boot 3.2.2. Updated it to 3.1.0.RELEASE and aligned explicit gRPC dependencies with the grpc-spring 3.1.0 documented gRPC version.
- The dependency snippet used only `opentelemetry-sdk-extension-autoconfigure`, but the code injects OpenTelemetry into Spring components and relies on Spring configuration. Replaced it with the official `opentelemetry-spring-boot-starter` setup and added OpenTelemetry instrumentation BOMs for version alignment.
- The custom Micrometer metrics example required actuator/Micrometer infrastructure and exporting through OpenTelemetry. Added `spring-boot-starter-actuator` and enabled the OpenTelemetry starter's Micrometer bridge in `application.yml`.
- The post configured `otel.instrumentation.grpc.experimental-span-attributes`, but the examples use manual `GrpcTelemetry` interceptors. Moved that setting to `GrpcTelemetry.builder(...).setCaptureExperimentalSpanAttributes(true)` in both server and client interceptor examples.
- The service and client examples injected `Tracer` directly. The OpenTelemetry Spring Boot starter documents `OpenTelemetry` as the Spring bean, so constructors now inject `OpenTelemetry` and create a tracer with `openTelemetry.getTracer(...)`.
- The retry example described `Thread.sleep(100 * attempt)` as exponential backoff. Changed the comment to describe it as a simple backoff.
- The streaming section showed a second `@GrpcService` implementation for the same generated gRPC service, which can cause duplicate service registration. Clarified that the streaming method should be added to the same registered service implementation and removed the duplicate registration annotation from the illustrative class.

## Review Notes
- The examples are still tutorial snippets and assume generated protobuf classes and application-specific services such as `OrderProcessingService` and inventory protobuf stubs exist.
- For production streaming services, consider gRPC flow-control APIs such as `ClientCallStreamObserver` or `ServerCallStreamObserver` for high-volume streams.
