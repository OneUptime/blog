# Validation Summary: How to Test Custom Span Processors and Exporters with the OpenTelemetry SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- Python span processors and exporters
- Node.js span processors and in-memory exporters
- pytest and Jest-style tests

## Sources Consulted
- OpenTelemetry Python SDK trace API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python trace export API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry JavaScript NodeTracerProvider API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html
- OpenTelemetry JavaScript InMemorySpanExporter API/source: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.InMemorySpanExporter.html and https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/InMemorySpanExporter.ts
- OpenTelemetry JavaScript SDK 2.0 announcement and migration context: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/

## Issues Found
- The description claimed coverage across Java, Python, and Node.js, but the post includes only Python and Node.js examples. Updated the description to match the actual content.
- The introduction said OpenTelemetry SDK test utilities are provided in every language, which was too broad. Changed it to "many languages."
- The Python `InMemorySpanExporter` import used `opentelemetry.sdk.trace.export.in_memory`, which is not the current documented/importable path. Updated examples to use `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The redaction processor explanation incorrectly suggested attributes could be redacted in `on_start` even though most attributes are added after span start and `on_end` receives a read-only `ReadableSpan`. Reworked the example to redact values as `set_attribute` is called and added a payload-redacting exporter wrapper for cases where exporter-level redaction is more appropriate.
- The custom exporter span helper created a span with one provider and then discarded it before creating the actual in-memory exported span. Removed the unused provider/span creation and added `provider.force_flush()`.
- The network failure test used Python's built-in `ConnectionError` while the mocked code is using `requests.post`. Updated the test to use `requests.exceptions.ConnectionError`.
- The Node.js example used `provider.addSpanProcessor(customProcessor)`, which is no longer the current OpenTelemetry JS SDK 2.x pattern. Updated it to pass `spanProcessors` in the `NodeTracerProvider` constructor.
- The Node.js shutdown test asserted after `provider.shutdown()`, but the JavaScript in-memory exporter clears finished spans during shutdown. Updated the test to call `provider.forceFlush()` and renamed the test accordingly.

## Review Notes
OpenTelemetry packages are not installed in this workspace, so the snippets could not be executed locally. API names and behavior were checked against official OpenTelemetry documentation and source. The Python processor example is suitable for demonstrating a custom processor that intercepts direct `set_attribute` calls; production redaction that must cover all exported data is better implemented in an exporter wrapper or collector processor.
