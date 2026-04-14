# Validation Summary: How to Use Dapr Java SDK with Maven

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Dapr Java SDK (io.dapr:dapr-sdk, io.dapr:dapr-sdk-springboot, io.dapr:dapr-sdk-workflows)
- Dapr Spring Boot Starter (io.dapr.spring:dapr-spring-boot-starter)
- Apache Maven
- Spring Boot 3.3.0
- Maven Wrapper Plugin
- Dapr CLI (`dapr run`)

## Sources Consulted
- Maven Central (search.maven.org) — verified existence and versions of all Dapr SDK artifacts
- Dapr Java SDK GitHub repository (https://github.com/dapr/java-sdk) — verified artifact IDs, group IDs, and module structure
- Dapr CLI documentation (https://docs.dapr.io/reference/cli/dapr-run/) — verified `dapr run` flags and syntax
- Apache Maven Failsafe Plugin documentation — verified standard integration test invocation
- Maven Central for maven-wrapper-plugin — confirmed version 3.3.2 exists

## Issues Found

### 1. Non-existent BOM artifact (`io.dapr:dapr-sdk-bom`)
**What was wrong:** The post referenced `io.dapr:dapr-sdk-bom` version 1.13.0 in a `<dependencyManagement>` section. This artifact has never been published to Maven Central. It exists in the Dapr Java SDK source code (master branch) but has not been released.
**What was changed:** Removed the entire BOM section and added explicit version numbers to all Dapr dependency declarations. Updated the introduction and summary to remove BOM references.

### 2. Incorrect artifact name for workflow SDK
**What was wrong:** The post used `dapr-sdk-workflow` (singular). The correct artifact ID on Maven Central is `dapr-sdk-workflows` (plural).
**What was changed:** Changed `dapr-sdk-workflow` to `dapr-sdk-workflows` and added the correct version `0.13.0` (the workflow SDK uses 0.x versioning, not 1.x like the core SDK).

### 3. Non-standard Maven integration test command
**What was wrong:** The post showed `mvn verify -Pfailsafe` for running integration tests. There is no standard Maven profile named "failsafe" — the Maven Failsafe Plugin binds to the `verify` lifecycle phase automatically when configured.
**What was changed:** Changed to `mvn verify`, which is the standard way to run integration tests with the Failsafe plugin.

## Review Notes
- The `dapr-sdk-workflows` artifact uses `0.x` versioning (e.g., 0.13.0) which differs from the core `dapr-sdk` versioning (1.x). This is worth noting for readers who might expect all Dapr artifacts to share the same version number.
- The `dapr-spring-boot-starter` also uses `0.x` versioning, which the post already had correct at 0.13.0.
- The `maven-wrapper-plugin` version 3.3.2 is valid but not the latest (3.3.4 is available). This is acceptable since the post doesn't claim it's the latest.
- Spring Boot 3.3.0 dependencies and plugin versions are consistent and valid.
- The `dapr run` CLI syntax including `--app-id`, `--app-port`, and `--` separator is correct per official Dapr documentation.
