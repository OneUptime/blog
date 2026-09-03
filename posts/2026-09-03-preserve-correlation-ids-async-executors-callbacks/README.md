# Preserve Correlation IDs Across Async Executors and Callbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, OpenTelemetry, Distributed Tracing, Application Logging

Description: Preserve trace and correlation context across executors, callbacks, futures, and thread pools without leaking one request's identity into another.

---

Correlation IDs disappear in asynchronous code because most logging and tracing integrations read an execution-local “current context.” A thread-local value follows a call stack on one thread; an executor queues work and may later run it on an unrelated pooled thread. Unless the code captures context at scheduling time and restores it while the task runs, the callback sees an empty or stale context.

The safe pattern is **capture, attach, execute, detach**. OpenTelemetry's Context API exists to carry execution-scoped values across logically related units, and language implementations provide wrappers or framework integrations for common asynchronous types.

## Diagnose the Boundary

Start with a minimal log on both sides of every scheduling point:

~~~text
request thread: trace_id=... span_id=... correlation_id=...
before submit:  trace_id=... span_id=... correlation_id=...
task start:     trace_id=... span_id=... correlation_id=...
callback start: trace_id=... span_id=... correlation_id=...
~~~

If the value exists before `submit` but not at task start, the executor boundary is not instrumented. If the task has context but a completion callback does not, callback registration or the reactive scheduler is the missing boundary. If the wrong request's ID appears, a scope was not closed or a mutable logging context was left on a pooled thread.

Do not “fix” the problem with a global variable. Concurrent requests will overwrite it. `InheritableThreadLocal` is also not a general executor solution: pool threads often exist before the request, and inheritance occurs when a thread is created rather than for each submitted task.

## Capture Context When Work Is Scheduled

Context should represent the logical parent at submission time, not whatever happens to be current when the worker eventually runs. In OpenTelemetry Java, `Context` is immutable and provides wrappers for `Runnable`, `Callable`, `ExecutorService`, functions, consumers, and suppliers. The essential shape is:

~~~java
Context submittingContext = Context.current();

executor.submit(submittingContext.wrap(() -> {
    Span span = tracer.spanBuilder("recalculate-cart").startSpan();
    try (Scope ignored = span.makeCurrent()) {
        logger.info("recalculating cart");
        recalculate();
    } catch (RuntimeException | Error error) {
        span.recordException(error);
        throw error;
    } finally {
        span.end();
    }
}));
~~~

The exact APIs vary by language. Use the supported executor, coroutine, task, or reactive instrumentation rather than inventing a custom carrier whenever possible. Automatic instrumentation can wrap well-known frameworks, but verify coverage for custom executors and nonstandard callbacks.

Capture before the originating span ends. A span context remains usable for linking after a span ends, but a child that logically belongs to the submitted operation should be constructed from the intended captured parent. For detached background work that outlives the request, consider a new root span with a link instead of a child relationship that makes an operation hours later look like one bounded request execution.

## Keep Trace Context and Log Context Aligned

Trace context and a logging MDC are often separate mechanisms. Activating an OpenTelemetry context does not universally populate every logging framework's correlation field, and copying an MDC does not create trace parentage. Configure the supported log instrumentation or explicitly derive log fields from the active span.

For non-OTLP structured formats, OpenTelemetry recommends top-level lowercase fields:

~~~json
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "correlation_id": "wf_8J3M2",
  "message": "cart recalculated"
}
~~~

The correlation ID can live in an application context or allowlisted baggage, but baggage is not automatically turned into log or span attributes. Add it deliberately. Avoid using a correlation ID as a metric label when it has unbounded cardinality.

## Close Every Scope on the Same Execution Path

Context leaks occur when code attaches a context and fails to detach it. Use language constructs such as `try/finally`, try-with-resources, `defer`, or structured concurrency so cleanup runs on success, error, and cancellation.

Follow these rules:

- create the scope inside the worker, not on the submitting thread;
- close it on the same thread or logical execution where it was made current;
- never keep a scope in an object for an arbitrary later caller to close;
- end spans when the asynchronous operation actually completes, not immediately after callback registration;
- handle cancellation and timeout paths;
- clear any manually installed MDC values in `finally`.

A common bug is:

~~~text
make context current
submit task
return without closing scope
~~~

That leaks context on the request thread while failing to install it on the worker. The scope brackets execution; it does not teleport context into a queue.

## Treat Fan-Out and Fan-In Explicitly

When one request submits ten independent tasks, each task can be a child of the submission span. When a callback combines results from several traces or messages, there is no single honest parent. Start a new span and add links to all contributing span contexts. OpenTelemetry links can reference spans in the same or different traces and should be supplied at creation when available so sampling can consider them.

Do not reuse one mutable context object and append different correlation IDs for each task. OpenTelemetry Context is conceptually immutable; derive a context per logical unit. Give repeated tasks separate spans even when they share the workflow correlation ID.

## Verify Framework and Executor Coverage

Build a small test matrix:

| Boundary | Expected relationship |
| --- | --- |
| direct function call | active context retained |
| executor `submit` | captured parent restored in worker |
| future continuation | continuation sees completion context by policy |
| scheduled retry | new attempt span, stable workflow ID |
| cancellation | scope closed and span ended |
| fan-in | links to all inputs, no arbitrary parent |

Run many requests concurrently with unique IDs. Assert that no worker log contains another request's ID. Also inspect exported parent span IDs, not only the presence of a trace ID. A stale context can look correlated while pointing to the wrong operation.

For Java, OpenTelemetry documents wrappers around `ExecutorService`, `ScheduledExecutorService`, `Runnable`, `Callable`, and functional interfaces. Other languages have different context storage and async integrations; consult that language's current API and instrumentation docs. Framework upgrades can change which boundaries are automatically instrumented, so retain these concurrency tests.

## Conclusion

Async context is not lost randomly; it stops at an execution boundary that did not transfer it, or it is erased by premature cleanup. Capture the immutable context when work is scheduled, restore it only for the task, create the right child or linked span, align log enrichment with the active span, and always detach in a guaranteed cleanup path. That preserves correlation without contaminating reused threads.

## Official References

- [OpenTelemetry Context Specification](https://opentelemetry.io/docs/specs/otel/context/)
- [OpenTelemetry Java API: Context](https://opentelemetry.io/docs/languages/java/api/#context-api)
- [OpenTelemetry Java Instrumentation: Context Propagation](https://opentelemetry.io/docs/languages/java/instrumentation/#context-propagation)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
