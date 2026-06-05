# Validation Summary: How to Trace Starlette Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- Starlette
- ASGI
- OpenTelemetry Python API and SDK
- OpenTelemetry Starlette instrumentation
- OpenTelemetry OTLP exporter
- SQLAlchemy async engine instrumentation
- WebSocket routing
- HTTP trace context propagation

## Sources Consulted
- OpenTelemetry Starlette instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/starlette/starlette.html
- OpenTelemetry SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry asyncpg instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncpg/asyncpg.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry HTTPX instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- Starlette routing documentation: https://www.starlette.dev/routing/
- Starlette WebSocket documentation: https://www.starlette.io/websockets/
- Starlette endpoints documentation: https://www.starlette.io/endpoints/

## Issues Found
- The post overstated Starlette automatic instrumentation as capturing middleware execution and route handling details. Updated the wording to reflect that the Starlette instrumentation creates request-level spans and ASGI receive/send spans, while middleware can annotate the active span or create manual child spans.
- The middleware section incorrectly said each middleware creates a child span. Reworded it to explain that the example annotates the active request span and that explicit child spans require `tracer.start_as_current_span(...)`.
- The middleware example used `asyncio.get_event_loop().time()`. Updated it to `asyncio.get_running_loop().time()`, which is the clearer current API inside an async function.
- The database example combined `databases.Database` with `SQLAlchemyInstrumentor`, implying SQLAlchemy instrumentation would automatically trace those calls. Replaced it with an instrumented SQLAlchemy async engine using `create_async_engine(...)` and `engine.sync_engine`, matching the official SQLAlchemy instrumentation guidance.
- The database example claimed query parameters are automatically shown. Removed that claim because SQLAlchemy instrumentation documents query tracing, while parameter capture is not the default behavior shown in the official usage.
- The WebSocket example used `Route("/ws", ChatEndpoint)`. Updated it to import and use `WebSocketRoute`, which Starlette documents as the correct route type for WebSocket endpoints.
- The installation commands omitted optional packages needed by the later SQLAlchemy database example. Added an optional install command for `opentelemetry-instrumentation-sqlalchemy`, `sqlalchemy`, and `aiosqlite`.

## Review Notes
The core tracing setup, OTLP gRPC exporter usage, custom span creation, span status/error recording, sampling example, and manual context propagation pattern are consistent with current OpenTelemetry Python documentation. The performance numbers are plausible as rough guidance, but they are not guaranteed by OpenTelemetry and may vary by exporter, sampling configuration, and runtime workload.
