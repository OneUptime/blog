# Validation Summary: How to Propagate Trace Context Across Async Boundaries (Threads, Promises)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry context propagation
- Python threading and ThreadPoolExecutor
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- Node.js AsyncLocalStorage and async_hooks context management
- Go context.Context and OpenTelemetry Go tracing
- Java CompletableFuture and OpenTelemetry Java Context

## Sources Consulted
- OpenTelemetry Python context API: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry JavaScript ContextAPI reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.ContextAPI.html
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- Oracle Java CompletableFuture API documentation: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- OpenTelemetry Context specification: https://opentelemetry.io/docs/specs/otel/context/

## Issues Found
- The Python ThreadPoolExecutor example submitted `process_item()` with an extra argument, which would call the decorated function with no `item_id` and then pass an argument to a zero-argument closure. Changed the submission to `executor.submit(process_item(i))` and wrapped the executor in a context manager so the example is executable and cleans up the pool.
- The JavaScript event emitter explanation overstated `setTimeout` context loss. Node.js async context normally propagates through timers created inside the active context. Updated the wording to distinguish timers scheduled inside the active context from scheduled jobs created outside a request context.
- The JavaScript broken event emitter example emitted directly from a promise continuation created inside the active span, so it was not a reliable example of context loss. Updated the example to emit from a scheduler created outside the request context.
- The fixed JavaScript event emitter example used `emitter.on` inside request handling, which could leave request-specific listeners installed. Changed it to `emitter.once` for the one-shot example.

## Review Notes
The examples use placeholder functions and types such as `do_work`, `database`, `Request`, `Order`, and `fetchOrderDetails`, which is acceptable for a conceptual blog post. The Java section title mentions virtual threads but the section focuses on CompletableFuture and executor-thread context; future revisions could either add a virtual-thread-specific note or narrow the heading.
