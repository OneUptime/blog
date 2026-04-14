# Validation Summary: How to Use Dapr Java Client

## Status
validated

## Post Type
Tutorial / API Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr:dapr-sdk`)
- Project Reactor (Mono/Flux reactive types)
- Java (try-with-resources, generics)
- Spring Boot (mentioned for auto-configuration)

## Sources Consulted
- Dapr Java SDK source code on GitHub: https://github.com/dapr/java-sdk
  - `DaprClient.java` interface — verified all method signatures, return types, and deprecation annotations
  - `DaprClientBuilder.java` — verified `withPropertyOverride` method signature
  - `Properties.java` — verified `HTTP_PORT` and `GRPC_PORT` property constants
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/java/

## Issues Found

1. **Unused `CloudEvent` import in Publishing Events section**: The code imported `io.dapr.client.domain.CloudEvent` but never used it in the examples. Removed the unused import.

2. **`invokeMethod` deprecation not mentioned**: All `invokeMethod` overloads on `DaprClient` are annotated `@Deprecated` in the current SDK. The Javadoc recommends using language-native HTTP or gRPC clients for service invocation. Added a deprecation note before the Service Invocation code examples.

## Review Notes
- The `subscribeConfiguration` example prints the raw `SubscribeConfigurationResponse` object via `toString()`. While this compiles and runs, in practice you would call `update.getItems()` to get a `Map<String, ConfigurationItem>` with the actual changed values. This is a minor code quality observation, not an error.
- All method signatures, parameter orders, return types, and import paths were verified correct against the actual SDK source code.
- The `getSecret` example retrieves the value using `secret.get("db-password")` — this is correct as the map key matches the secret name for single-value secrets, though multi-value secrets may have different keys.
- The claim that DaprClient implements `AutoCloseable` (enabling try-with-resources) is confirmed correct.
