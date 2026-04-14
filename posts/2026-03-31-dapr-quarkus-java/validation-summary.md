# Validation Summary: How to Use Dapr with Quarkus Java Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK
- Quarkus Java framework
- GraalVM native compilation
- CDI (Contexts and Dependency Injection)
- Mutiny reactive programming (SmallRye)
- Jakarta REST (JAX-RS)

## Sources Consulted
- Dapr Java SDK GitHub repository: https://github.com/dapr/java-sdk
- Dapr Java SDK on Maven Central: https://central.sonatype.com/artifact/io.dapr/dapr-sdk
- Dapr Java SDK Javadoc: https://dapr.github.io/java-sdk/io/dapr/client/DaprClient.html
- Quarkus Getting Started Reactive guide: https://quarkus.io/guides/getting-started-reactive
- Quarkus Mutiny Primer: https://quarkus.io/guides/mutiny-primer
- Quarkus 3.9 "Big Reactive Rename" release notes: https://quarkus.io/blog/quarkus-3-9-1-released/
- Quarkus Native Applications Tips: https://quarkus.io/guides/writing-native-applications-tips
- JSON specification (RFC 8259)

## Issues Found

1. **Quarkus version / extension name mismatch**: The post used Quarkus 3.6.0 with extension names `rest` and `rest-jackson`, but these names were only introduced in Quarkus 3.9 (the "Big Reactive Rename"). Quarkus 3.6.0 used `resteasy-reactive` and `resteasy-reactive-jackson`. Updated the version to 3.15.0 to match the extension names used.

2. **Reactor Mono returned from Quarkus endpoints**: The CatalogResource returned `Mono<T>` (Project Reactor) from JAX-RS endpoints. Quarkus REST uses Mutiny as its reactive model and does not natively support Reactor types as return values. Endpoints returning `Mono` would fail at runtime. Rewrote all endpoints to return `Uni<T>` (Mutiny), converting from Dapr's `Mono` using `Uni.createFrom().publisher()`. Replaced Reactor operators (`flatMap`, `then`, `thenReturn`) with Mutiny equivalents (`chain`, `replaceWith`).

3. **Outdated Dapr SDK version**: Updated from 1.10.0 to 1.14.0. The original version was significantly outdated.

4. **Unused import**: Removed `import io.dapr.Topic` from CatalogSubscriber — the `@Topic` annotation was imported but never used in the code. The subscriber uses the manual `/dapr/subscribe` endpoint pattern instead.

5. **Invalid JSON comment**: The reflect-config.json code block contained a `//` comment (`// src/main/resources/...`). JSON (RFC 8259) does not support comments and the file would fail to parse. Moved the file path outside the JSON code block as a preceding label.

6. **Summary text**: Updated the closing summary to reference Mutiny Uni instead of Reactor Mono, to match the corrected code.

## Review Notes
- The GraalVM reflection config at `META-INF/native-image/reflect-config.json` works, but Quarkus's preferred approach is the `@RegisterForReflection` annotation on classes that need reflection access during native compilation. This is a best-practice consideration, not an error.
- The `CatalogItem` and `PriceUpdate` model classes are referenced but not defined in the post. This is acceptable for a tutorial that focuses on Dapr integration patterns.
- The `dapr-sdk-actors` dependency is included but actors are not used in any of the examples. It is not incorrect to include it, but it is unnecessary for the patterns demonstrated.
- The CDI producer pattern for `DaprClient` works correctly. An alternative approach would be to use a `@Disposes` method instead of `@PreDestroy` for the produced bean's lifecycle, but the current approach is functionally equivalent since the producer class itself is `@ApplicationScoped`.
