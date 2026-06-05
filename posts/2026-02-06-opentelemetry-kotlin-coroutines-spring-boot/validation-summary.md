# Validation Summary: How to Configure OpenTelemetry for Kotlin Coroutines in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java API and SDK
- OpenTelemetry Java Spring Boot starter
- OpenTelemetry Kotlin extension
- Kotlin coroutines
- Spring Boot and Spring WebFlux
- JUnit 5 OpenTelemetry testing

## Sources Consulted
- OpenTelemetry Java intro and dependency/BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry Spring Boot starter getting started guide: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Java Kotlin extension README/source: https://github.com/open-telemetry/opentelemetry-java/tree/main/extensions/kotlin
- OpenTelemetry Java SDK testing OpenTelemetryExtension source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/testing/src/main/java/io/opentelemetry/sdk/testing/junit5/OpenTelemetryExtension.java
- Kotlin kotlinx.coroutines CoroutineScope API documentation: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-coroutine-scope/
- Kotlin kotlinx.coroutines ThreadContextElement API documentation: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-thread-context-element/
- Kotlin coroutine context and dispatcher documentation: https://kotlinlang.org/docs/coroutine-context-and-dispatchers.html
- Spring Framework Kotlin coroutine support documentation: https://docs.spring.io/spring-framework/reference/languages/kotlin/coroutines.html

## Issues Found
- The original post used outdated fixed OpenTelemetry versions and did not use the recommended BOM-based dependency management for the Spring Boot starter. Updated the dependency snippet to use `opentelemetry-instrumentation-bom:2.28.1` and unversioned OpenTelemetry artifacts managed by the BOM.
- The original coroutine propagation examples hand-rolled custom context elements and used `makeCurrent()` incorrectly. `Context.makeCurrent()` returns a `Scope` that must be closed, and a plain `makeCurrent()` scope is thread-local and not safe across suspend/resume boundaries. Replaced those examples with the official `Context.current().asContextElement()` pattern from `opentelemetry-extension-kotlin`.
- The Spring configuration originally created `OpenTelemetryContextElement()` at bean initialization time, which would capture the wrong context for request-scoped traces. Updated the text and code to provide an application-owned coroutine scope and instruct launching work with the current OpenTelemetry context at launch time.
- The `traceSuspend` helper originally made a span current with a thread-local scope around a suspend block. Updated it to wrap the block in `withContext(parentContext.with(span).asContextElement())`, preserving the span context across suspension points.
- A service-layer comment described a sequential order fetch as parallel processing. Updated the comment to match the code.
- The parallel coroutine example omitted imports for `Tracer` and `delay`. Added the missing imports.
- The test used Kotlin `assert`, which can be disabled at runtime, and imported an unused `SpanKind`. Replaced assertions with JUnit `assertEquals` and `assertNotNull`, and removed the unused import.
- Updated stale references to the removed custom `OpenTelemetryContextElement` in the pitfalls and conclusion.

## Review Notes
- The post is now technically aligned with current OpenTelemetry Java 1.62.0 / instrumentation 2.28.1 guidance as of 2026-06-05.
- The code snippets are illustrative and assume the surrounding Spring Boot project already has Kotlin, Spring WebFlux, and JUnit dependencies configured.
