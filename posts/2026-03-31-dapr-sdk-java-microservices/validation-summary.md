# Validation Summary: How to Use Dapr SDK for Java to Build Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr:dapr-sdk` v1.13.0)
- Dapr Spring Boot integration (`io.dapr:dapr-sdk-springboot`)
- Spring Boot / Spring MVC
- Project Reactor (reactive programming)
- Redis (state store example)
- Kafka (pub/sub example)

## Sources Consulted
- Dapr Java SDK GitHub repository: https://github.com/dapr/java-sdk
- Dapr Java SDK source code for `DaprClient`, `DaprClientBuilder`, `State`, `CloudEvent`, `HttpExtension`, `Topic`, and `Property` classes
- Maven Central for `io.dapr:dapr-sdk` version history and metadata
- Dapr CLI documentation for `dapr run` command flags

## Issues Found

### 1. Incorrect `dapr.http.port` in `application.yaml`
- **What was wrong:** The post included `dapr.http.port: 3500` in `application.yaml`, implying the Dapr Java SDK reads its sidecar port from Spring's property files. The SDK uses its own property resolution mechanism (system properties via `-D` flags or environment variables like `DAPR_HTTP_PORT`), not Spring's `application.yaml`.
- **What was changed:** Removed the `dapr.http.port` entry from the YAML block and added an explanatory note that the sidecar HTTP port is configured via the `--dapr-http-port` flag in the `dapr run` command or the `DAPR_HTTP_PORT` environment variable.

### 2. Deprecated `--components-path` flag
- **What was wrong:** The `dapr run` command used `--components-path`, which is deprecated.
- **What was changed:** Replaced `--components-path` with `--resources-path`, which is the current recommended flag.

## Review Notes
- The SDK version used (1.13.0) is valid and exists on Maven Central, but is outdated. The latest stable version is 1.17.2 as of April 2026. The APIs shown are correct for 1.13.0, so this was not changed to avoid introducing potential compatibility issues.
- The `invokeMethod` API used in Step 6 (ServiceInvoker) is deprecated in newer versions of the SDK. The Dapr project recommends using language-native HTTP clients or gRPC clients for service invocation instead. This is noted but was not changed since the API is still functional in v1.13.0.
- The `DaprClientBuilder().build()` pattern does not close the client. In production code, `DaprClient` implements `Closeable` and should be properly managed (e.g., with a `@PreDestroy` method or `DisposableBean`).
- All other code examples (state management, pub/sub, secrets, `@Topic` annotation, `CloudEvent` handling) are technically correct and use the proper API signatures.
