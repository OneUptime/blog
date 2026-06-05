# Validation Summary: How to Use In-Memory Span Exporters to Assert Span Creation in Unit Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Java SDK
- Unit testing with in-memory span exporters

## Sources Consulted
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python SDK trace/export source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry Python InMemorySpanExporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry Python instrumentation status documentation: https://opentelemetry.io/docs/languages/python/instrumentation/#set-span-status
- OpenTelemetry JavaScript NodeTracerProvider API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html
- OpenTelemetry JavaScript InMemorySpanExporter API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.InMemorySpanExporter.html
- OpenTelemetry JavaScript BasicTracerProvider source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/BasicTracerProvider.ts
- OpenTelemetry Java InMemorySpanExporter Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-testing/latest/io/opentelemetry/sdk/testing/exporter/InMemorySpanExporter.html
- Maven Central metadata for opentelemetry-sdk-testing: https://repo.maven.apache.org/maven2/io/opentelemetry/opentelemetry-sdk-testing/maven-metadata.xml
- OpenTelemetry trace status specification: https://opentelemetry.io/docs/specs/otel/trace/api/#set-status

## Issues Found
- The Python example attempted to save and restore the global tracer provider for each test. OpenTelemetry Python only allows setting the global tracer provider once, so repeated tests would not be isolated. Changed the fixture to create a test provider and inject `provider.get_tracer("test")` into `OrderService`.
- The Node.js example used `provider.addSpanProcessor(...)`, which has been removed from the current `BasicTracerProvider` API in favor of the `spanProcessors` constructor option. Updated the `NodeTracerProvider` construction accordingly.
- The Node.js example registered a global tracer provider in every test. Global provider registration is not needed when the service accepts an injected tracer and can cause test isolation problems. Updated the example to pass `provider.getTracer("test")` to `OrderService`.
- The Java dependency version was outdated. Updated `opentelemetry-sdk-testing` from `1.34.0` to `1.63.0`, the current Maven Central release at validation time.
- The Node.js and Java happy-path tests asserted `OK` status. OpenTelemetry spans default to `UNSET`, and `OK` is normally only present when application code explicitly sets it. Changed those assertions to `UNSET`; the Python example already used `span.status.is_ok`, which treats non-error spans correctly.
- The cleanup tip implied both `reset()` and `clear()` were interchangeable across languages. Updated it to say Python uses `clear()`, while Java and Node.js use `reset()`.
- The parent-child relationship tip used a JavaScript-shaped `span.parentSpanId` field that is not portable. Updated it to refer to language-specific parent span context or parent span ID fields.

## Review Notes
The examples assume `OrderService` accepts an injected tracer and records exception events in error cases. That is the right shape for isolated unit tests, but a future post could include a minimal `OrderService` implementation to make the snippets fully runnable end to end.
