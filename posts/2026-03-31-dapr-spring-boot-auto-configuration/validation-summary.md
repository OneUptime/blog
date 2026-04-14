# Validation Summary: How to Configure Dapr with Spring Boot Auto-Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr`)
- Dapr Spring Boot Starter (`io.dapr.spring:dapr-spring-boot-starter`)
- Spring Boot Auto-Configuration
- Spring Data (CrudRepository)
- Java / Maven

## Sources Consulted
- Dapr Java SDK source code — https://github.com/dapr/java-sdk
- Dapr Spring Boot auto-configuration module — `dapr-spring/dapr-spring-boot-autoconfigure/` in the Java SDK repo
- `DaprClientProperties.java` — Spring Boot `@ConfigurationProperties` with prefix `dapr.client`
- `DaprClientAutoConfiguration.java` — the actual auto-configuration class registered in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
- `DaprClientBuilder.java` — confirms `withPropertyOverride` method and `Properties.HTTP_ENDPOINT` / `Properties.GRPC_ENDPOINT` constants
- `DaprMessagingTemplate.java` — confirms `send(String topic, T message)` method signature
- Dapr Spring Data module — `dapr-spring/dapr-spring-data/` in the Java SDK repo
- Maven Central for artifact verification

## Issues Found

1. **Incorrect Spring Boot property names for endpoints**: The post used `dapr.http.endpoint` and `dapr.grpc.endpoint`, which are SDK-level system property names (from `io.dapr.config.Properties`), not Spring Boot application.yml properties. The correct Spring Boot properties are `dapr.client.http-endpoint` and `dapr.client.grpc-endpoint` (bound via `DaprClientProperties` with prefix `dapr.client`). **Fixed** the YAML configuration block to use the correct property paths.

2. **Non-existent `DaprKeyValueRepository` interface**: The post claimed that `io.dapr.spring.data.DaprKeyValueRepository` exists and that repositories should extend it. This interface does not exist in the Dapr SDK. The Dapr Spring Data integration uses standard Spring Data `CrudRepository` interfaces, activated with the `@EnableDaprRepositories` annotation. **Fixed** to use `CrudRepository` directly, removed the bogus import, and added mention of `@EnableDaprRepositories`.

3. **Wrong auto-configuration class name**: The post referenced `DaprAutoConfiguration.class` for exclusion, but this class does not exist. The actual class is `DaprClientAutoConfiguration` in the package `io.dapr.spring.boot.autoconfigure.client`. **Fixed** to use the correct class name with proper import statement.

4. **Unused import**: The original repository example imported both `DaprKeyValueRepository` and `CrudRepository` but only used the former. This was cleaned up as part of fix #2.

## Review Notes
- The Maven artifact version `0.13.0` is valid but outdated. The latest stable release is `0.14.1`. The post does not claim it is the latest, so this is not an error, but readers should be aware they may want to use a newer version.
- The `dapr.pubsub.name` and `dapr.statestore.name` property names are correct. However, these properties have no built-in defaults (they are null unless explicitly set), whereas the YAML example shows them with values that could be mistaken for defaults. The YAML is presented as "available properties" rather than "defaults," so this is acceptable.
- The `DaprMessagingTemplate.send()` method signature is correct. The template requires a `pubsubName` at construction time (injected by auto-configuration), so the `send("topic", message)` usage shown is accurate for auto-configured usage.
- The `DaprClientBuilder` code example with `withPropertyOverride` is verified correct against the SDK source.
