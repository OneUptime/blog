# Validation Summary: How to Troubleshoot Kotlin Coroutine Context Loss When

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Java API and Context API
- OpenTelemetry Kotlin coroutine context extension
- OpenTelemetry Java agent
- Kotlin coroutines
- Spring WebFlux
- Project Reactor

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Context specification: https://opentelemetry.io/docs/specs/otel/context/
- OpenTelemetry Java repository artifact list for `opentelemetry-extension-kotlin`: https://github.com/open-telemetry/opentelemetry-java
- OpenTelemetry Kotlin extension README: https://github.com/open-telemetry/opentelemetry-java/tree/main/extensions/kotlin
- OpenTelemetry Kotlin extension source for `asContextElement()`: https://github.com/open-telemetry/opentelemetry-java/blob/main/extensions/kotlin/src/main/kotlin/io/opentelemetry/extension/kotlin/ContextExtensions.kt
- OpenTelemetry Java instrumentation supported libraries list: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java agent README: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Reactor 3.1 library README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/reactor/reactor-3.1/library
- OpenTelemetry Reactor `ContextPropagationOperator` source: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/reactor/reactor-3.1/library/src/main/java/io/opentelemetry/instrumentation/reactor/v3_1/ContextPropagationOperator.java

## Issues Found
- The initial problem example created a span with `startSpan()` but did not make it current, so the surrounding explanation about losing the thread-local current context was inaccurate. I changed the example to call `span.makeCurrent()` and to show a child span being created after suspension without the intended parent context.
- The first coroutine fix opened a `Scope` with `span.makeCurrent()` around suspending code. OpenTelemetry's Kotlin extension is intended to carry context through the coroutine context instead of relying on a thread-local scope across suspension. I changed the example to use `Context.current().with(span).asContextElement()` and removed the manual `Scope`.
- The reusable `withTracing` helper used `span.asContextElement()` directly. This API is valid, but I changed it to `Context.current().with(span).asContextElement()` so the example explicitly preserves the current parent context while adding the new span.
- The Java agent section claimed a specific minimum version, `1.28+`, for automatic Kotlin coroutine context propagation. The current official supported-libraries documentation confirms Kotlin Coroutines support but does not state that version floor, so I removed the version-specific claim.

## Review Notes
The Reactor dependency and `ContextPropagationOperator.create().registerOnEachOperator()` usage match the current OpenTelemetry Reactor 3.1 library documentation. The Java agent command uses the standard `-javaagent` JVM flag and a valid OpenTelemetry instrumentation enablement property form.
