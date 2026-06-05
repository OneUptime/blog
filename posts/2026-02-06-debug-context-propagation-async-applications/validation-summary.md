# Validation Summary: How to Debug Context Propagation in Asynchronous Applications

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry context propagation
- OpenTelemetry Java API and Context API
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- Python asyncio, contextvars, and thread pool executors
- Java ExecutorService and CompletableFuture
- Node.js async context management
- Kafka message header propagation
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Java Context Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-context/1.48.0/io/opentelemetry/context/Context.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript API reference for ContextAPI: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.ContextAPI.html
- Python asyncio task documentation: https://docs.python.org/3.12/library/asyncio-task.html

## Issues Found
- The Python examples imported `get_current` but did not use it. Removed the unused import to keep the snippet accurate.
- The Python `run_in_executor()` examples used `asyncio.get_event_loop()` inside coroutines. Changed these to `asyncio.get_running_loop()`, which is the current documented API for retrieving the active loop from async code.
- The Node.js section stated that `setTimeout` is a bad pattern that can lose context. Current OpenTelemetry JavaScript documentation explains that context propagation depends on a configured context manager and commonly uses `async_hooks` or `AsyncLocalStorage`; timers are normally handled when that is configured. Updated the wording to focus on missing context manager setup and callback/event-emitter cases that run outside the request's async context.
- The Node.js fix text said to use `context.with()`, but the example actually used `context.bind()`. Updated the explanation to match the official `context.bind(context, target)` API used in the code.
- The Kafka Java producer used platform-default byte encoding with `value.getBytes()`. Changed it to `StandardCharsets.UTF_8` for deterministic propagation header encoding.
- The Kafka Java consumer snippet used `List` and `ArrayList` without imports. Added the missing imports.
- The Kafka Java consumer decoded header bytes with the platform default charset and did not guard against a null carrier in the getter. Updated decoding to UTF-8 and added a null-carrier check.

## Review Notes
The Java examples still use illustrative placeholders such as `producer`, `handleMessage`, `Order`, and `OrderRequest`; these are acceptable for a tutorial snippet but would need surrounding application code to compile as standalone files. The OpenTelemetry API usage itself is current and consistent with the consulted documentation.
