# Validation Summary: Why Do Correlation IDs Disappear in Async Threads? Preserving Context Across Executors and Callbacks

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry Context API
- OpenTelemetry Java API
- Java executors, thread pools, `Runnable`, and asynchronous callbacks
- Distributed tracing, spans, parent relationships, and span links
- Correlation IDs, OpenTelemetry baggage, and logging MDC
- Structured log and trace correlation

## Sources Consulted

- [OpenTelemetry Context specification](https://opentelemetry.io/docs/specs/otel/context/)
- [OpenTelemetry Java API documentation](https://opentelemetry.io/docs/languages/java/api/#context-api)
- [OpenTelemetry Java `Context` source and API contract](https://github.com/open-telemetry/opentelemetry-java/blob/main/context/src/main/java/io/opentelemetry/context/Context.java)
- [OpenTelemetry Java instrumentation and context propagation documentation](https://opentelemetry.io/docs/languages/java/instrumentation/#context-propagation)
- [OpenTelemetry Trace API specification: links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [OpenTelemetry Baggage API specification](https://opentelemetry.io/docs/specs/otel/baggage/api/)
- [OpenTelemetry trace context in non-OTLP log formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [Java `InheritableThreadLocal` API documentation](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/InheritableThreadLocal.html)

## Issues Found
No technical issues found.

## Review Notes
The Java example correctly captures `Context.current()` at submission time and uses `Context.wrap(Runnable)` to make that context current only while the worker task executes. The current Java API also provides the executor, scheduled executor, callable, consumer, function, and supplier wrappers described in the post. The discussion of immutable contexts, scope cleanup, baggage enrichment, non-OTLP `trace_id` and `span_id` fields, and creation-time span links is consistent with the current OpenTelemetry specifications. Framework-specific continuation behavior still depends on the selected framework and instrumentation, as the post notes.
