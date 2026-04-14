# Validation Summary: How to Use Dapr Java SDK with Gradle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Java SDK (io.dapr:dapr-sdk)
- Dapr Spring Boot Starter (io.dapr.spring:dapr-spring-boot-starter)
- Dapr SDK Workflows (io.dapr:dapr-sdk-workflows)
- Gradle with Kotlin DSL
- Gradle Version Catalogs (libs.versions.toml)
- Spring Boot 3.3.0
- Kotlin 2.0.0
- Java 21

## Sources Consulted
- Maven Central artifact search for io.dapr group (https://repo1.maven.org/maven2/io/dapr/)
- Maven Central artifact search for io.dapr.spring group (https://repo1.maven.org/maven2/io/dapr/spring/)
- Dapr Java SDK GitHub repository (https://github.com/dapr/java-sdk)
- Dapr Java SDK releases (https://github.com/dapr/java-sdk/releases)
- Gradle Version Catalogs documentation (https://docs.gradle.org/current/userguide/version_catalogs.html)
- Gradle Platforms documentation (https://docs.gradle.org/current/userguide/platforms.html)
- Gradle issue #16665 regarding version catalog type/classifier support (https://github.com/gradle/gradle/issues/16665)

## Issues Found

### 1. Non-existent BOM artifact (`io.dapr:dapr-sdk-bom`)
- **What was wrong:** The post used `implementation(platform("io.dapr:dapr-sdk-bom:1.13.0"))` and told readers versions would be managed by the BOM. However, `io.dapr:dapr-sdk-bom` has never been published to Maven Central. It exists only in the source code on the master branch of the Dapr Java SDK repo but has not been released.
- **What was changed:** Removed the BOM import and added explicit versions to all Dapr dependencies. Changed the section title from "Managing Dapr Versions with Platform BOM" to "Adding Dapr Dependencies" and updated the introductory text.
- **Why:** Using a non-existent BOM would cause build failures. Explicit versions are the correct approach for the Dapr Java SDK.

### 2. Wrong artifact name: `dapr-sdk-workflow` (singular)
- **What was wrong:** The post used `io.dapr:dapr-sdk-workflow` but the correct artifact ID is `io.dapr:dapr-sdk-workflows` (plural).
- **What was changed:** Corrected to `io.dapr:dapr-sdk-workflows` in both the dependencies block and the version catalog.
- **Why:** Using the wrong artifact name would cause a dependency resolution failure.

### 3. Missing version for workflow dependency
- **What was wrong:** The workflow dependency had no explicit version, relying on the non-existent BOM. Additionally, at the 1.13.0 era, the workflows module used a `0.x` version scheme (0.13.0), not 1.13.0.
- **What was changed:** Added explicit version `0.13.0` for `io.dapr:dapr-sdk-workflows`. Added a `dapr-workflows = "0.13.0"` version entry in the version catalog.
- **Why:** The workflows module historically used a separate versioning scheme from the core SDK.

### 4. Invalid `type = "pom"` in Gradle version catalog TOML
- **What was wrong:** The version catalog entry for the BOM used `type = "pom"`, which is not a valid attribute in Gradle's `libs.versions.toml` format. The TOML format only supports `module` (or `group` + `name`) and `version` (or `version.ref`).
- **What was changed:** Removed the BOM entry entirely from the version catalog (since the BOM doesn't exist). The `type = "pom"` syntax was eliminated.
- **Why:** Using an unsupported attribute in the TOML file would cause a Gradle configuration error.

### 5. Summary section referenced non-existent BOM
- **What was wrong:** The summary stated "Using the Dapr BOM platform dependency keeps versions consistent across all SDK modules."
- **What was changed:** Updated to reference Gradle version catalogs instead: "Using a Gradle version catalog keeps versions consistent across all SDK modules."
- **Why:** Accuracy — the post no longer uses a BOM, so the summary should reflect the actual approach.

## Review Notes
- The Dapr Java SDK has since released version 1.17.2. Starting from version 1.16.0, the workflow module version was unified with the core SDK (e.g., `io.dapr:dapr-sdk-workflows:1.16.0`). Readers using newer versions should use matching versions across all modules.
- A BOM artifact (`io.dapr:dapr-sdk-bom`) exists in the Dapr Java SDK source repository and may be published in a future release. If/when it becomes available, the BOM-based approach would be the preferred way to manage Dapr dependency versions.
- The Spring Boot (3.3.0), Kotlin (2.0.0), and dependency-management plugin (1.1.5) versions used in the post are valid and compatible, though newer versions exist.
- The custom `daprRun` Gradle task syntax and Dapr CLI flags are correct.
- All standard Gradle commands shown in the "Building and Testing" section are correct.
