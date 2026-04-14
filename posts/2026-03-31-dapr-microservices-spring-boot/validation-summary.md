# Validation Summary: How to Build Microservices with Dapr and Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Spring Boot
- Java
- Dapr Java SDK (`io.dapr:dapr-sdk`)
- Redis (as state store and pub/sub backend)
- CloudEvents

## Sources Consulted
- Dapr official documentation — CLI reference (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr official documentation — State management component spec for Redis (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr official documentation — Pub/sub component spec for Redis (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr official documentation — Component YAML schema (https://docs.dapr.io/operations/components/component-schema/)
- Dapr Java SDK source code on GitHub (https://github.com/dapr/java-sdk) — verified `DaprClient` method signatures, `CloudEvent<T>` generics, `@Topic` annotation, and `HttpExtension` constants

## Issues Found
1. **Deprecated CLI flag `--components-path`**: The `dapr run` commands used `--components-path`, which was deprecated in Dapr CLI v1.11 in favor of `--resources-path`. Updated both `dapr run` commands to use `--resources-path`.

## Review Notes
- The `DaprClient.invokeMethod()` API used in the "Service Invocation Between Services" section is marked as `@Deprecated` in the current Dapr Java SDK. Dapr now recommends using native HTTP or gRPC clients for service invocation instead. The code still compiles and works, but readers building new projects should be aware of this deprecation.
- The component YAML block shows two separate files (`statestore.yaml` and `pubsub.yaml`) joined by a `---` YAML document separator. This is slightly ambiguous — readers might think it's a single file. The inline comments clarify the intent, so no change was made.
- All other code examples (`saveState`, `publishEvent`, `getState`, `@Topic` subscription, `CloudEvent<T>`) are correct and match the current Dapr Java SDK API.
