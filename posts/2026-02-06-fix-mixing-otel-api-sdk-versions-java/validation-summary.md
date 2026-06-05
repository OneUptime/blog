# Validation Summary: How to Fix the Mistake of Mixing OpenTelemetry API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java API and SDK
- OpenTelemetry Java instrumentation BOM
- Java
- Maven
- Gradle
- Maven Enforcer Plugin

## Sources Consulted
- OpenTelemetry Java intro and BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry Spring Boot starter dependency management documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry API 1.30.0 `SpanBuilder` Javadocs: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.30.0/io/opentelemetry/api/trace/SpanBuilder.html
- OpenTelemetry API 1.34.0 `SpanBuilder` Javadocs: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.34.0/io/opentelemetry/api/trace/SpanBuilder.html
- OpenTelemetry instrumentation BOM 2.1.0 POM: https://repo.maven.apache.org/maven2/io/opentelemetry/instrumentation/opentelemetry-instrumentation-bom/2.1.0/opentelemetry-instrumentation-bom-2.1.0.pom
- OpenTelemetry core BOM 1.34.0 and 1.35.0 POMs: https://repo.maven.apache.org/maven2/io/opentelemetry/opentelemetry-bom/
- Maven dependency mediation documentation: https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
- Maven Dependency Plugin `dependency:tree` documentation: https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html
- Maven Enforcer built-in rules documentation: https://maven.apache.org/enforcer/enforcer-rules/
- Gradle dependency reporting documentation: https://docs.gradle.org/current/userguide/viewing_debugging_dependencies.html

## Issues Found
- The Maven and Gradle examples imported both `opentelemetry-bom:1.34.0` and `opentelemetry-instrumentation-bom:2.1.0`. OpenTelemetry documents these BOMs as hierarchical, and the instrumentation BOM 2.1.0 imports `opentelemetry-bom:1.35.0`, so importing both is redundant and can lead to unintuitive dependency resolution. I changed the examples to use the instrumentation BOM alone when instrumentation dependencies are involved.
- The parent POM example used the core BOM even though the surrounding guidance included instrumentation dependencies. I changed it to the instrumentation BOM so child modules inherit compatible instrumentation and core versions from one place.
- The runtime `NoSuchMethodError` example named `SpanBuilder.setAttribute(AttributeKey, Object)` as a missing method, but that method exists in both OpenTelemetry API 1.30.0 and 1.34.0. I replaced it with a generic OpenTelemetry missing-method shape and added a caveat about older transitive dependencies, alpha artifacts, and instrumentation mismatches.
- The "Which Versions Must Match" section said both BOMs handle both groups and implied all listed groups must share the same version number. I clarified that core artifacts are managed by `opentelemetry-bom`, instrumentation artifacts are managed by `opentelemetry-instrumentation-bom`, and the instrumentation BOM imports a compatible core BOM.
- The runtime version check said an API and SDK implementation-version mismatch is itself a problem. Because compatible BOM-managed instrumentation versions may intentionally use different core and instrumentation version numbers, I changed the comment to compare the runtime API version with the dependency tree rather than requiring a direct SDK string match.

## Review Notes
The Maven command and Gradle dependency-report command are valid according to official documentation. Maven was not installed in the local environment, so Maven CLI behavior was verified against official Maven documentation and repository POMs rather than local execution.
