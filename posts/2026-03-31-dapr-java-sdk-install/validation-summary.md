# Validation Summary: How to Install and Configure the Dapr Java SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr:dapr-sdk`)
- Dapr Spring Boot integration (`io.dapr:dapr-sdk-springboot`)
- Java / Maven / Gradle
- Project Reactor
- Spring Boot

## Sources Consulted
- Dapr Java SDK GitHub repository (https://github.com/dapr/java-sdk) — source code for `DaprClient`, `DaprClientBuilder`, `State`, Spring Boot modules, and `pom.xml` build configuration
- Maven Central — artifact availability and version history for `io.dapr:dapr-sdk`, `io.dapr:dapr-sdk-springboot`, and `io.dapr:dapr-sdk-bom`
- Dapr CLI documentation (https://docs.dapr.io/reference/cli/dapr-run/)

## Issues Found

1. **`dapr-sdk-bom` artifact not available on Maven Central**: The blog used `io.dapr:dapr-sdk-bom` as a BOM import in both Maven and Gradle configurations. This artifact exists in the Dapr Java SDK source tree but has not been published to Maven Central. Removed the BOM and added explicit version numbers to each dependency instead.

2. **Java version requirement incorrect**: The post stated "Java 17 or later" as a prerequisite. The current stable Dapr Java SDK (through 1.14.1) requires Java 11 as the minimum. Java 17 is only set as the minimum on the unreleased master branch. Changed to "Java 11 or later".

3. **Spring Boot auto-configuration claim inaccurate**: The post claimed `dapr-sdk-springboot` enables `@Autowired DaprClient` with zero configuration. In current releases, `dapr-sdk-springboot` does not auto-configure a `DaprClient` bean. Users must define their own `@Bean DaprClient` using `DaprClientBuilder`. Added a `@Configuration` class example showing how to define the bean, and updated the surrounding text accordingly.

4. **SDK version outdated**: Updated from version `1.12.0` to `1.14.1` (the latest stable release) across all Maven and Gradle examples.

## Review Notes
- The core Java API usage (`DaprClientBuilder`, `DaprClient`, `saveState`, `getState`, `State.getValue()`) is correct and well-demonstrated.
- The reactive (Project Reactor) example is accurate — Dapr Java SDK does use `Mono` and `Flux` from Project Reactor.
- `DaprClient` correctly implements `AutoCloseable`, so the try-with-resources pattern shown is valid.
- The Dapr CLI `dapr run` command syntax is correct.
- The claim that the SDK communicates over gRPC is accurate (it uses gRPC as the primary protocol and also maintains an HTTP client internally).
- A new `dapr-spring-boot-autoconfigure` module is under development in the Dapr Java SDK that will provide true auto-configuration of `DaprClient` in a future release. When that ships, the Spring Boot section could be simplified back to the original pattern.
