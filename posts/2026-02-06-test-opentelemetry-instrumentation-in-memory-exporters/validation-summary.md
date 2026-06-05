# Validation Summary: How to Test Your OpenTelemetry Instrumentation with In-Memory Exporters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- In-memory span exporters
- Span processors
- Pytest fixtures

## Sources Consulted
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go tracetest package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest
- OpenTelemetry JavaScript InMemorySpanExporter API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.InMemorySpanExporter.html
- OpenTelemetry Java InMemorySpanExporter API documentation: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-testing/latest/io/opentelemetry/sdk/testing/exporter/InMemorySpanExporter.html

## Issues Found
- The Python pytest fixture created and registered a new global `TracerProvider` before every test. OpenTelemetry Python documents that `trace.set_tracer_provider()` can only set the global provider once per process, so later attempts would only log a warning and would not reliably attach the new in-memory exporter. Changed the example to register one provider/exporter at module scope and clear the exporter before and after each test.
- The conclusion said in-memory exporters are built into the official SDKs for Python, Go, Java, and JavaScript. Java provides its in-memory exporter through the official SDK testing artifact, so the wording was changed to say these exporters are available from the official SDK or testing packages.

## Review Notes
The Python and Go APIs shown are current according to official documentation. Local execution was not possible because the workspace does not have the Python OpenTelemetry package or the Go toolchain installed.
