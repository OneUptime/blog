# How to Troubleshoot Kotlin Coroutine Context Loss When Using OpenTelemetry in Spring WebFlux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kotlin, Coroutines, Spring WebFlux

Description: Fix OpenTelemetry trace context loss when Kotlin coroutines switch threads in Spring WebFlux reactive applications.

Kotlin coroutines can suspend and resume on different threads. OpenTelemetry's context is stored in thread-local storage (or Java's `Context` API), which does not automatically follow coroutine suspensions. This causes trace context to be lost when a coroutine resumes on a different thread, resulting in orphaned spans.

## The Problem

```kotlin
@RestController
class UserController(private val userService: UserService) {

    @GetMapping("/api/users/{id}")
    suspend fun getUser(@PathVariable id: String): User {
        // This span is created on thread-1
        val span = tracer.spanBuilder("getUser").startSpan()

        val user = userService.findById(id)  // Suspends...
        // Resumes on thread-2 - the span context is lost!

        span.end()  // This runs on thread-2 without the context
        return user
    }
}
```

## Why Context Is Lost

Java's `io.opentelemetry.context.Context` uses a `ThreadLocal` to track the current context. When a coroutine suspends on thread-1 and resumes on thread-2:

1. Thread-1's ThreadLocal has the span context
2. The coroutine suspends (thread-1 is released)
3. The coroutine resumes on thread-2
4. Thread-2's ThreadLocal is empty - context is gone

## Fix 1: Use the Kotlin Coroutine Context Extension

The OpenTelemetry Kotlin extension bridges coroutine context with OpenTelemetry context:

```xml
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-extension-kotlin</artifactId>
</dependency>
```

```kotlin
import io.opentelemetry.extension.kotlin.asContextElement
import io.opentelemetry.api.trace.Span
import kotlinx.coroutines.withContext

@GetMapping("/api/users/{id}")
suspend fun getUser(@PathVariable id: String): User {
    val span = tracer.spanBuilder("getUser").startSpan()
    val scope = span.makeCurrent()

    return try {
        // Pass the OTel context as a coroutine context element
        withContext(span.asContextElement()) {
            val user = userService.findById(id)
            user
        }
    } finally {
        scope.close()
        span.end()
    }
}
```

The `asContextElement()` function creates a coroutine context element that carries the OpenTelemetry context across suspensions.

## Fix 2: Use the OpenTelemetry Java Agent

The OpenTelemetry Java agent (1.28+) includes automatic Kotlin coroutine context propagation:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.kotlinx-coroutines.enabled=true \
     -jar myapp.jar
```

The agent patches `kotlinx.coroutines` to automatically propagate OpenTelemetry context across coroutine boundaries.

## Fix 3: Create a Traced Coroutine Wrapper

Build a utility function that handles context propagation:

```kotlin
import io.opentelemetry.api.trace.Span
import io.opentelemetry.api.trace.StatusCode
import io.opentelemetry.extension.kotlin.asContextElement
import kotlinx.coroutines.withContext

suspend fun <T> withTracing(
    spanName: String,
    attributes: Map<String, String> = emptyMap(),
    block: suspend (Span) -> T
): T {
    val span = tracer.spanBuilder(spanName).apply {
        attributes.forEach { (key, value) -> setAttribute(key, value) }
    }.startSpan()

    return withContext(span.asContextElement()) {
        try {
            val result = block(span)
            result
        } catch (e: Exception) {
            span.setStatus(StatusCode.ERROR, e.message ?: "Unknown error")
            span.recordException(e)
            throw e
        } finally {
            span.end()
        }
    }
}

// Usage
@GetMapping("/api/users/{id}")
suspend fun getUser(@PathVariable id: String): User {
    return withTracing("getUser", mapOf("user.id" to id)) { span ->
        val user = userService.findById(id)
        span.setAttribute("user.found", user != null)
        user ?: throw NotFoundException("User not found")
    }
}
```

## Fix 4: Use Reactor Context for WebFlux

Spring WebFlux uses Project Reactor under the hood. The OpenTelemetry Reactor integration bridges Reactor's context with OpenTelemetry:

```xml
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-reactor-3.1</artifactId>
</dependency>
```

When using the Java agent, Reactor context propagation is handled automatically. For SDK users:

```kotlin
import io.opentelemetry.instrumentation.reactor.v3_1.ContextPropagationOperator

// Initialize once at startup
ContextPropagationOperator.create().registerOnEachOperator()
```

## Testing Context Propagation

Write a test to verify context is maintained:

```kotlin
@Test
fun `trace context survives coroutine suspension`() = runBlocking {
    val exporter = InMemorySpanExporter.create()
    // ... setup provider with exporter

    withTracing("parent") { parentSpan ->
        withTracing("child") { childSpan ->
            // Child should have parent as its parent
            delay(100) // Force suspension
        }
    }

    val spans = exporter.finishedSpanItems
    val parent = spans.find { it.name == "parent" }!!
    val child = spans.find { it.name == "child" }!!

    assertEquals(parent.spanId, child.parentSpanId)
    assertEquals(parent.traceId, child.traceId)
}
```

## Summary

Kotlin coroutines and OpenTelemetry context do not play well together by default because coroutines can switch threads on suspension. Use the `opentelemetry-extension-kotlin` package to bridge the two context systems, or let the Java agent handle it automatically with the kotlinx-coroutines instrumentation. Always verify with tests that context survives suspension points.
