# Validation Summary: How to Use Dapr Service Invocation Between Java and Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- Dapr Java SDK (`io.dapr:dapr-sdk` and `io.dapr:dapr-sdk-springboot` v1.11.0)
- Dapr JavaScript SDK (`@dapr/dapr` v3.x)
- Java Spring Boot (WebFlux / reactive)
- Node.js with Express
- Docker Compose (sidecar pattern with `daprio/daprd`)

## Sources Consulted
- Dapr Java SDK Javadoc: https://dapr.github.io/java-sdk/
- Dapr Java SDK docs: https://docs.dapr.io/developing-applications/sdks/java/
- Maven Central for `io.dapr:dapr-sdk:1.11.0`: https://search.maven.org/artifact/io.dapr/dapr-sdk/1.11.0/jar
- Dapr JS SDK docs: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr JS SDK on npm: https://www.npmjs.com/package/@dapr/dapr
- Dapr self-hosted Docker Compose docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/

## Issues Found

### 1. Node.js SDK `invoker.invoke` used string literals instead of `HttpMethod` enum
- **What was wrong:** The Node.js code calling the Java service used raw string literals `'GET'` and `'POST'` as the HTTP method parameter in `client.invoker.invoke()`.
- **What was changed:** Imported `HttpMethod` from `@dapr/dapr` and replaced `'GET'` with `HttpMethod.GET` and `'POST'` with `HttpMethod.POST`.
- **Why:** The official Dapr JS SDK documentation consistently uses the `HttpMethod` enum. While string literals happen to work at runtime (since the enum values equal the strings), using the enum is the documented and recommended approach.

### 2. Docker Compose `daprd` command used single-dash flags
- **What was wrong:** The `daprd` command arrays in Docker Compose used single-dash flags (`-app-id`, `-app-port`).
- **What was changed:** Changed to double-dash flags (`--app-id`, `--app-port`).
- **Why:** The official Dapr Docker Compose documentation uses double-dash flags for `daprd` commands. While Go's flag package accepts both forms at runtime, double-dash is the documented convention for Docker Compose deployments.

## Review Notes
- The Dapr Java SDK version 1.11.0 is confirmed to exist on Maven Central. However, newer versions are available (1.13.0+). The post is correct for 1.11.0 but readers may want to check for the latest version.
- The `DaprClient.invokeMethod()` signature with `(appId, methodName, data, HttpExtension, Class<T>)` returning `Mono<T>` is confirmed accurate via the official Javadoc.
- The `DaprClient` constructor in the JS SDK with `{ daprHost, daprPort }` options is confirmed for v3.x of `@dapr/dapr`.
- The Docker Compose sidecar pattern using `network_mode: "service:<app>"` is the documented approach for sharing the network namespace between app and Dapr sidecar.
- The `daprio/daprd:latest` image tag is valid but the docs recommend pinned versions for production use.
- The Docker Compose setup relies on mDNS for sidecar-to-sidecar discovery, which is Dapr's default in self-hosted mode. This works correctly when containers share the same Docker network.
