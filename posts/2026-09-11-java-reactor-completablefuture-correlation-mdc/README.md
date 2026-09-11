# Preserve Correlation IDs in Reactor and CompletableFuture MDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Java, Reactor, Logging, Distributed Tracing

Description: Bridge Java correlation metadata into MDC at execution time for Reactor signals and CompletableFuture stages, restoring pooled threads after each callback.

---

Java logging MDC commonly stores values on the current thread. Reactor can move signals between scheduler threads, while `CompletableFuture` stages can run on an executor or the thread that completes the previous stage. A request-thread MDC value therefore does not automatically identify later callbacks.

Capture the intended correlation metadata when work is registered, install it only around the code that logs, and restore the previous MDC afterward. For Reactor, keep the durable execution value in Reactor `Context`; use MDC as a temporary view for the logging framework.

## Restore the previous MDC, not just an empty map

This helper works with SLF4J and an MDC-capable logging provider such as Logback:

```java
import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.MDC;

static <T> T withMdc(Map<String, String> captured, Supplier<T> work) {
    Map<String, String> previous = MDC.getCopyOfContextMap();
    try {
        if (captured == null) MDC.clear();
        else MDC.setContextMap(captured);
        return work.get();
    } finally {
        if (previous == null) MDC.clear();
        else MDC.setContextMap(previous);
    }
}
```

The methods are utility methods to place inside a class. `getCopyOfContextMap` can return `null`, so the helper handles that explicitly. Restoring the previous map preserves an outer scope when callbacks are nested; merely calling `MDC.clear()` would erase unrelated outer context.

The [SLF4J MDC API](https://www.slf4j.org/apidocs/org/slf4j/MDC.html) defines these copy and replacement operations. An SLF4J binding without MDC support will not make these values visible in logs, so configure and inspect the actual provider.

## Capture each CompletableFuture stage at registration

Wrap callbacks with an immutable snapshot of the registration context:

```java
import java.util.Collections;
import java.util.HashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Function;

static Map<String, String> snapshotMdc() {
    Map<String, String> values = MDC.getCopyOfContextMap();
    return values == null ? null
        : Collections.unmodifiableMap(new HashMap<>(values));
}

static <T> Supplier<T> captureSupplier(Supplier<T> work) {
    Map<String, String> captured = snapshotMdc();
    return () -> withMdc(captured, work);
}

static <T, R> Function<T, R> captureFunction(Function<T, R> work) {
    Map<String, String> captured = snapshotMdc();
    return value -> withMdc(captured, () -> work.apply(value));
}
```

Register stages inside the request scope:

```java
ExecutorService pool = Executors.newFixedThreadPool(4);
Map<String, String> requestMdc = Map.of("correlation_id", "request-42");
try {
    CompletableFuture<String> result = withMdc(requestMdc, () ->
        CompletableFuture.supplyAsync(captureSupplier(() -> {
            logger.info("Loading inventory");
            return "available";
        }), pool).thenApplyAsync(captureFunction(value -> {
            logger.info("Formatting inventory result");
            return value.toUpperCase(java.util.Locale.ROOT);
        }), pool)
    );
    result.join();
} finally {
    pool.shutdown();
}
```

This is demonstration code inside a method with a configured `logger`. In a server, manage a shared executor through the application's lifecycle instead of creating a pool per request.

Wrapping only an executor is not always enough: a dependent future may submit its next stage from the thread completing the previous one, after the registration context has disappeared. Here, each callback captures the intended request context when the chain is assembled.

The [CompletableFuture API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html) documents execution policies for synchronous and asynchronous stages. Apply the same discipline to completion, exception, and cancellation callbacks that log.

## Keep Reactor context in the subscription

For Reactor, use a context key and bridge it only while emitting a log:

```java
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

static final String CORRELATION = "correlation_id";

Mono<String> result = Mono.just("available")
    .publishOn(Schedulers.parallel())
    .doOnEach(signal -> {
        if (!signal.isOnNext() && !signal.isOnError()) return;
        String id = signal.getContextView().getOrDefault(CORRELATION, "missing");
        Map<String, String> fields = new HashMap<>();
        Map<String, String> current = MDC.getCopyOfContextMap();
        if (current != null) fields.putAll(current);
        fields.put(CORRELATION, id);
        withMdc(fields, () -> {
            if (signal.isOnError()) logger.error("Inventory failed", signal.getThrowable());
            else logger.info("Inventory received");
            return null;
        });
    })
    .contextWrite(context -> context.put(CORRELATION, "request-42"));
```

Supply a real validated ID at the HTTP boundary. Reactor `Context` belongs to the subscriber and is visible upstream from the `contextWrite` position. It is not a mutable thread-local map traveling alongside each data value. The [Reactor context guide](https://projectreactor.io/docs/core/release/reference/advancedFeatures/context.html) explains this direction and the isolation of inner sequences.

Do not set MDC before returning a `Mono` and clear it in `doFinally`. Subscription may occur later, work may change threads, and cleanup may run on a different thread. Bracket the individual callback instead.

## Account for automatic context propagation

Some Spring/Reactor applications already use Micrometer context propagation and configured thread-local accessors. Inventory those integrations before adding manual wrappers. Two competing owners can overwrite values or make a passing test depend on accidental ordering.

MDC restoration does not establish OpenTelemetry span parentage. If traces also need propagation, use the supported OpenTelemetry or Micrometer context integration and verify trace IDs and span IDs separately.

## Verify pooled-thread reuse

Run concurrent requests with different IDs on a small executor or scheduler. Force exceptions and cancellation. Assert that every callback logs the expected ID and that a subsequent unrelated task sees its own original MDC or an empty map.

Test future continuations that complete immediately and those that complete later; they can exercise different threads. For Reactor, test inner `flatMap` branches and a scheduler switch. A single successful request on one thread does not demonstrate isolation.

## Conclusion

Capture MDC for each future callback and restore the worker's previous state in `finally`. In Reactor, keep correlation in subscriber context and bridge it only around logging. These boundaries preserve request identity without leaking it into reused threads.

## Official Documentation

- [SLF4J MDC API](https://www.slf4j.org/apidocs/org/slf4j/MDC.html)
- [Java CompletableFuture execution policies](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [Reactor subscriber context](https://projectreactor.io/docs/core/release/reference/advancedFeatures/context.html)
