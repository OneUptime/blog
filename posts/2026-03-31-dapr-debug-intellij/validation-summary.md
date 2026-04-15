# Validation Summary: How to Debug Dapr Applications in IntelliJ IDEA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, state management API, CLI)
- IntelliJ IDEA (Run/Debug configurations, Remote JVM Debug)
- Java (Spring Boot, RestTemplate)
- Kotlin (Spring Boot)
- Gradle (bootRun task)
- JVM debugging (JDWP agent)

## Sources Consulted
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference for `dapr stop`: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr environment variables reference: https://docs.dapr.io/reference/environment/
- Oracle JPDA Connection and Invocation (JDWP): https://docs.oracle.com/en/java/javase/17/docs/specs/jpda/conninv.html
- Spring Boot documentation for RestTemplate and web annotations
- IntelliJ IDEA documentation for Run/Debug configurations

## Issues Found
- **Mermaid diagram inconsistency**: The flowchart diagram used `sleep inf` while all actual command examples used `sleep infinity`. Fixed the diagram to use `sleep infinity` for consistency. Both forms work on GNU coreutils, but the post should be internally consistent.

## Review Notes
- The `-- sleep infinity` approach to running the Dapr sidecar without an app is a valid and widely-used community pattern. However, `dapr run` without any trailing command also keeps the sidecar alive, which is the simpler documented approach. The current approach is not wrong, just slightly more verbose than necessary.
- The JDWP `address=*:5005` syntax is correct for Java 9+ (which changed the default to localhost-only). For purely local debugging, `address=localhost:5005` would be more secure, but `*:5005` is the more general form and appropriate for a tutorial.
- The `DAPR_HTTP_PORT` environment variable is automatically injected by `dapr run` into child processes, but must be set manually when the app is started separately from IntelliJ. The post correctly instructs users to do this but could be more explicit about why.
- Java code uses `List.of()` and `Map.of()` which require Java 9+. This is fine for modern projects but worth noting for readers on older JDK versions.
- The Kotlin `order["orderId"]!!` uses a non-null assertion that could throw a NullPointerException if the key is missing. This is acceptable for a tutorial example.
