# Validation Summary: How to Use Dapr with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Spring Boot 3.x
- Java
- Dapr Java SDK (`io.dapr.spring:dapr-spring-boot-starter`)
- Dapr CLI

## Sources Consulted
- Maven Central: io.dapr.spring:dapr-spring-boot-starter versions — https://central.sonatype.com/artifact/io.dapr.spring/dapr-spring-boot-starter/versions
- Dapr Spring Boot official documentation — https://docs.dapr.io/developing-applications/sdks/java/spring-boot/
- Dapr Java SDK properties reference — https://docs.dapr.io/developing-applications/sdks/java/java-client/properties/
- DaprClient Javadoc — https://dapr.github.io/java-sdk/io/dapr/client/DaprClient.html
- CloudEvent Javadoc — https://dapr.github.io/java-sdk/io/dapr/client/domain/CloudEvent.html
- HttpExtension Javadoc — https://dapr.github.io/java-sdk/io/dapr/client/domain/HttpExtension.html
- Topic annotation Javadoc — https://dapr.github.io/java-sdk/io/dapr/Topic.html
- Dapr CLI run reference — https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Invalid dependency version (line 24)
- **What was wrong:** The post specified version `0.13.0` for `io.dapr.spring:dapr-spring-boot-starter`. This version was never published as a release on Maven Central. The earliest available version is `0.16.0-rc-1`, the first stable release is `1.16.0`, and the latest stable is `1.17.2`.
- **What was changed:** Updated version from `0.13.0` to `1.16.0`, which matches the version used in the official Dapr Spring Boot documentation.
- **Why:** Using a non-existent version would cause Maven dependency resolution to fail, making the tutorial impossible to follow.

### 2. Incorrect Spring Boot configuration property names (lines 31-32)
- **What was wrong:** The post used `dapr.http.endpoint` and `dapr.grpc.endpoint` as `application.properties` entries. These are core Dapr Java SDK system properties (read via `System.getProperty()`), not Spring Boot configuration properties. Placing them in `application.properties` would not configure the auto-configured `DaprClient` bean from the Spring Boot starter.
- **What was changed:** Replaced with the correct Spring Boot starter properties: `dapr.client.http-endpoint`, `dapr.client.http-port`, `dapr.client.grpc-endpoint`, and `dapr.client.grpc-port`. The endpoint and port are separate properties in the Spring Boot starter configuration.
- **Why:** The original properties would be silently ignored by the Spring Boot auto-configuration, potentially causing connection failures or confusing behavior when running against non-default Dapr sidecar ports.

## Review Notes
- The Dapr Spring Boot integration is noted as being in **alpha** status per the official documentation. Readers should be aware that APIs and property names may change in future releases.
- All DaprClient API usages (`saveState`, `getState`, `publishEvent`, `invokeMethod`) were verified as correct with proper method signatures and return types (`Mono<>` with `.block()` for synchronous execution).
- The `@Topic` annotation usage (`io.dapr.Topic` with `name` and `pubsubName` attributes) is correct.
- The `CloudEvent<T>` generic class from `io.dapr.client.domain` is correctly used.
- The `HttpExtension.GET` constant from `io.dapr.client.domain.HttpExtension` and the `invokeMethod` parameter order are correct.
- The `dapr run` CLI command syntax with `--app-id`, `--app-port`, `--dapr-http-port`, and `--` separator is correct per the CLI reference.
- Both kebab-case and camelCase are supported for the Spring Boot properties; kebab-case was chosen as it follows standard Spring Boot conventions.
