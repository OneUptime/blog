# Validation Summary: How to Understand the OpenTelemetry BOM for Dependency Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java
- OpenTelemetry Java instrumentation
- Maven dependency management and BOM imports
- Gradle platforms and BOM imports
- Java dependency version management

## Sources Consulted
- OpenTelemetry Java introduction and BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry Spring Boot starter dependency management documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry client versioning and stability specification: https://opentelemetry.io/docs/specs/otel/versioning-and-stability/
- Maven dependency mechanism and BOM import documentation: https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
- Gradle platform and BOM import documentation: https://docs.gradle.org/current/userguide/platforms.html
- Maven Central POM for io.opentelemetry:opentelemetry-bom:1.34.1: https://repo1.maven.org/maven2/io/opentelemetry/opentelemetry-bom/1.34.1/opentelemetry-bom-1.34.1.pom
- Maven Central POM for io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom:2.0.0: https://repo1.maven.org/maven2/io/opentelemetry/instrumentation/opentelemetry-instrumentation-bom/2.0.0/opentelemetry-instrumentation-bom-2.0.0.pom
- Maven Central POM for io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom-alpha:2.0.0-alpha: https://repo1.maven.org/maven2/io/opentelemetry/instrumentation/opentelemetry-instrumentation-bom-alpha/2.0.0-alpha/opentelemetry-instrumentation-bom-alpha-2.0.0-alpha.pom

## Issues Found
- The introduction claimed the OpenTelemetry BOM manages all OpenTelemetry dependency versions. Changed this to "related OpenTelemetry Java dependency versions" because OpenTelemetry publishes multiple BOMs with different scopes.
- The "Why OpenTelemetry Needs a BOM" section described instrumentations as part of the core library. Changed this to distinguish core API/SDK/exporters/extensions from separately released instrumentation artifacts.
- The instrumentation BOM section described instrumentation artifacts as "auto-instrumentation agents" and showed importing both the core BOM and the alpha instrumentation BOM. Updated the description to cover the Java agent, Spring Boot starter, and library instrumentation, and removed the redundant core BOM import because OpenTelemetry documents these BOMs as hierarchical and the instrumentation BOM POMs import the matching core BOMs.
- The best-practices section said to use one BOM version. Adjusted this to avoid redundant OpenTelemetry BOM imports and to choose the core or instrumentation BOM that covers the needed artifacts.

## Review Notes
The code snippets use historical versions (`1.34.1` and `2.0.0-alpha`) that exist in Maven Central and are internally consistent for the examples. Current OpenTelemetry Java versions are newer, so future maintenance could update the sample versions, but the older versions are not technically invalid.
