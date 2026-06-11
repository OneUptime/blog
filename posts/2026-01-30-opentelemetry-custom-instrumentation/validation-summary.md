# Validation Summary: How to Build OpenTelemetry Custom Instrumentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API and SDK
- OpenTelemetry Python instrumentation libraries
- Distributed tracing and context propagation
- OpenTelemetry semantic conventions
- Python
- pytest

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python BaseInstrumentor documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/base/instrumentor.html
- OpenTelemetry Python BaseInstrumentor source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/instrumentor.html
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python InMemorySpanExporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry semantic conventions for database spans: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry semantic conventions for HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry semantic conventions for messaging spans: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry semantic conventions for RPC spans: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/

## Issues Found
- The RPC examples used older `rpc.system` and `rpc.service` attributes. Updated them to current RPC semantic convention names: `rpc.system.name`, `server.address`, and `rpc.method`, and changed the client sample to extract the host from `service_url` before assigning `server.address`.
- The database semantic convention example used older `SpanAttributes.DB_*` constants and older attribute names such as `db.system`, `db.name`, `db.operation`, and `db.statement`. Updated the example to use current stable string attributes: `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, and `db.response.returned_rows`.
- The semantic conventions table listed older HTTP, database, messaging, and RPC attribute names. Updated it to current convention names.
- The registration example imported `opentelemetry.instrumentation.auto_instrumentation.sitecustomize` and iterated over `BaseInstrumentor.__subclasses__()`, which is not the supported user-facing way to enable registered instrumentations. Replaced it with the supported `opentelemetry-instrument python app.py` agent command.
- The testing fixture passed a tracer object to `TracerProvider.add_span_processor()`. That method expects a span processor, and the in-memory exporter must be registered through `SimpleSpanProcessor` or `BatchSpanProcessor`. Updated the fixture to import `SimpleSpanProcessor` and call `provider.add_span_processor(SimpleSpanProcessor(exporter))`.

## Review Notes
The Python snippets are syntactically valid after the fixes. Several examples still rely on placeholder proprietary functions or classes, such as `PaymentDeclinedException`, `_send_charge_request`, `sanitize_query`, and `process_rpc_method`, which is appropriate for illustrative blog examples but would need concrete implementations in runnable sample code.
