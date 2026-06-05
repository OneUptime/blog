# Validation Summary: How to Troubleshoot Missing Spans When the OpenTelemetry Java Agent Cannot

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java API
- Java agents
- Maven Shade Plugin
- gRPC Java
- Java bytecode instrumentation extensions

## Sources Consulted
- OpenTelemetry Java agent getting started and troubleshooting documentation: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java instrumentation repository README: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Java agent extension examples: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/examples/extension
- OpenTelemetry Java API documentation for spans, scope, status, and exception recording: https://opentelemetry.io/docs/languages/java/api/
- Apache Maven Shade Plugin relocation example: https://maven.apache.org/plugins/maven-shade-plugin/examples/class-relocation.html
- Apache Maven Shade Plugin shade goal reference: https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html

## Issues Found
- The opening example was too specific about the Java agent looking for `io.grpc.ManagedChannel`. I changed it to say that gRPC instrumentation targets classes in the `io.grpc` package, which better matches how agent instrumentation uses type matchers without overclaiming one exact class.
- The manual instrumentation Java snippet used `Scope` and `StatusCode` without importing them. I added the missing OpenTelemetry imports so the snippet is syntactically coherent.
- The custom Java agent extension snippet implemented `TypeInstrumentation` without the required `transform(TypeTransformer)` method and omitted the relevant imports. I added the imports and method stub, and used `Collections.singletonList` instead of `List.of` to match the Java 8-compatible style used in the official extension examples.
- The Maven shade workaround used a relocation exclusion under a `com.google` relocation to exclude `io.grpc`, which would not exclude gRPC from that relocation. I replaced it with an `artifactSet` exclusion for `io.grpc:*`, matching the shade plugin's documented artifact exclusion mechanism.

## Review Notes
- The custom instrumentation section remains intentionally skeletal because a complete shaded gRPC instrumentation would need method-specific Byte Buddy advice and testing against the exact shaded gRPC version.
- Excluding gRPC from the shaded artifact means the unshaded gRPC dependency must still be available on the application's runtime classpath.
