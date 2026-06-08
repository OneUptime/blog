# Validation Summary: How to Implement Custom OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/semantic-conventions`)
- OpenTelemetry Python SDK (`opentelemetry-api`, `opentelemetry-sdk`)
- TypeScript / Node.js
- Python (asyncio, contextlib)
- Mermaid diagrams
- Jest-style tests (`InMemorySpanExporter`, `SimpleSpanProcessor`)

## Sources Consulted
- OpenTelemetry JS upgrade guide to v2.x: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- `@opentelemetry/semantic-conventions` README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry JS instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html

## Issues Found

1. **`provider.addSpanProcessor()` removed in SDK v2.0** — The testing example in Section 13 used the old `provider.addSpanProcessor(new SimpleSpanProcessor(exporter))` pattern. This method was removed in `@opentelemetry/sdk-trace-base` v2.0 (April 2025). Updated to use the constructor-based registration: `new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })`.

2. **`SemanticAttributes` deprecated** — The "Semantic Conventions" example in Section 4 imported the deprecated `SemanticAttributes` object and referenced `SemanticAttributes.HTTP_METHOD`, `HTTP_URL`, `HTTP_TARGET`, `HTTP_STATUS_CODE`. The package now exposes individual `ATTR_*` constants matching the stabilized HTTP semantic conventions (semconv 1.21+): `http.method` → `http.request.method`, `http.url` → `url.full`, `http.target` → `url.path`, `http.status_code` → `http.response.status_code`. Updated imports and attribute names accordingly.

3. **Missing `SpanKind` import** — The same example referenced `SpanKind.CLIENT` without importing `SpanKind` from `@opentelemetry/api`. Added the missing import to make the snippet self-contained.

## Review Notes
- All other JS API surface (`trace.getTracer`, `tracer.startActiveSpan`, `tracer.startSpan`, `span.setAttribute`, `span.addEvent`, `span.recordException`, `span.setStatus`, `SpanStatusCode.OK/ERROR`, all five `SpanKind` members, `context.active()`, `context.with`, `trace.setSpan`) is current and correct.
- Python API usage (`trace.get_tracer`, `tracer.start_as_current_span`, `Status`, `StatusCode`, `SpanKind` from `opentelemetry.trace`) is correct. `Status` and `StatusCode` are validly re-exported from `opentelemetry.trace`.
- The Python decorator's use of `asyncio.iscoroutinefunction` to dispatch between sync/async wrappers is the correct idiom.
- Note: the Python `with_span` context manager's manual `record_exception` / `set_status` is technically redundant because `start_as_current_span` defaults to `record_exception=True` and `set_status_on_exception=True`. Not incorrect — just duplicative. No change made.
- The `messaging.operation` attribute values `'publish'` / `'process'` in the Kafka examples align with semconv messaging conventions (`messaging.operation.type` is the newer stable name, but `messaging.operation` remains widely used). Left as-is since the post is illustrative.
- Mermaid diagrams render correctly and accurately represent the described trace hierarchy.
