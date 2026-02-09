# How to Fix the OpenTelemetry Java Scope Not Being Closed Properly and Leaking Context Across Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Scope, Context Leak

Description: Fix the dangerous bug where an unclosed OpenTelemetry Scope leaks trace context from one request to the next in Java apps.

When you call `span.makeCurrent()` in Java, it returns a `Scope` object. If you do not close this Scope, the span remains as the "current" span on that thread. The next request that runs on the same thread inherits the previous request's span as its parent, creating incorrect parent-child relationships and corrupted traces.

## The Dangerous Pattern

```java
public void handleRequest(Request request) {
    Span span = tracer.spanBuilder("handleRequest").startSpan();
    Scope scope = span.makeCurrent();  // Sets this span as current on the thread

    processRequest(request);

    span.end();
    // MISSING: scope.close() - the span is still "current" on this thread!
}
```

When the next request arrives on the same thread, it sees the old span as the current context and becomes a child of the previous request's span. Your traces now show unrelated requests as parent-child:

```
handleRequest (request A)              [=====] 100ms
  handleRequest (request B)              [=====] 150ms   // WRONG PARENT
    handleRequest (request C)              [===] 80ms     // EVEN MORE WRONG
```

## The Fix: Always Close Scope in try-with-resources

Java's `Scope` implements `AutoCloseable`, so always use try-with-resources:

```java
public void handleRequest(Request request) {
    Span span = tracer.spanBuilder("handleRequest").startSpan();
    try (Scope scope = span.makeCurrent()) {
        processRequest(request);
    } catch (Exception e) {
        span.setStatus(StatusCode.ERROR, e.getMessage());
        span.recordException(e);
        throw e;
    } finally {
        span.end();
    }
}
```

The `try (Scope scope = span.makeCurrent())` pattern guarantees `scope.close()` is called when the block exits, restoring the previous context on the thread.

## Understanding Scope vs Span

These are two different things:

- **Span**: Represents a unit of work. Created with `spanBuilder().startSpan()`. Must be ended with `span.end()`.
- **Scope**: Represents the activation of a span on the current thread. Created with `span.makeCurrent()`. Must be closed with `scope.close()`.

Closing the scope restores the previous context. Ending the span finalizes it for export. You need to do both:

```java
Span span = tracer.spanBuilder("work").startSpan();
try (Scope scope = span.makeCurrent()) {
    // Span is current on this thread
    // Child spans created here will be children of this span
    doWork();
} finally {
    // scope.close() has been called by try-with-resources
    // Previous context is restored
    span.end();  // Span is finalized and sent for export
}
```

## Detecting Scope Leaks

The OpenTelemetry SDK can detect scope leaks if you enable leak detection:

```java
// Enable during development
System.setProperty("io.opentelemetry.context.enableStrictContext", "true");
```

With strict context enabled, unclosed scopes throw an error:

```
java.lang.AssertionError: Thread [main] opened a scope of SpanContext{...}
  here: <stack trace of makeCurrent()>
  but never closed it.
```

## Common Places Where Scope Leaks Occur

### In Filters/Interceptors

```java
// BROKEN - scope never closed
@Override
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
    Span span = tracer.spanBuilder("filter").startSpan();
    span.makeCurrent();  // Returns scope, but it's ignored!
    chain.doFilter(request, response);
    span.end();
}
```

**Fix:**

```java
@Override
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {
    Span span = tracer.spanBuilder("filter").startSpan();
    try (Scope scope = span.makeCurrent()) {
        chain.doFilter(request, response);
    } finally {
        span.end();
    }
}
```

### In Async Callbacks

```java
// BROKEN - scope opened in callback, never closed
executor.submit(() -> {
    Span span = tracer.spanBuilder("async-work").startSpan();
    span.makeCurrent();  // Leak!
    doAsyncWork();
    span.end();
});
```

**Fix:**

```java
executor.submit(() -> {
    Span span = tracer.spanBuilder("async-work").startSpan();
    try (Scope scope = span.makeCurrent()) {
        doAsyncWork();
    } finally {
        span.end();
    }
});
```

### In Spring AOP Advice

```java
// BROKEN - scope stored as field (shared across threads!)
@Aspect
public class TracingAspect {
    private Scope currentScope;  // NEVER store scope as a field

    @Before("execution(* com.mycompany.service.*.*(..))")
    public void before(JoinPoint joinPoint) {
        Span span = tracer.spanBuilder(joinPoint.getSignature().getName()).startSpan();
        currentScope = span.makeCurrent();  // This is a thread-safety bug
    }
}
```

**Fix:** Use method-local variables only:

```java
@Aspect
public class TracingAspect {

    @Around("execution(* com.mycompany.service.*.*(..))")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        Span span = tracer.spanBuilder(joinPoint.getSignature().getName()).startSpan();
        try (Scope scope = span.makeCurrent()) {
            return joinPoint.proceed();
        } catch (Throwable t) {
            span.setStatus(StatusCode.ERROR);
            span.recordException(t);
            throw t;
        } finally {
            span.end();
        }
    }
}
```

## The Rule

Never call `span.makeCurrent()` without immediately wrapping the result in a try-with-resources block. Never store a `Scope` in a field or pass it between threads. Always close the scope before the thread is returned to a thread pool.
