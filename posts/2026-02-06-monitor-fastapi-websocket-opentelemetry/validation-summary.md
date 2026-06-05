# Validation Summary: How to Monitor FastAPI WebSocket Connections with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- FastAPI
- Starlette WebSockets
- OpenTelemetry Python API and SDK
- OpenTelemetry FastAPI/ASGI instrumentation
- OpenTelemetry OTLP trace and metric exporters
- WebSocket monitoring and tracing

## Sources Consulted
- FastAPI WebSockets documentation: https://fastapi.tiangolo.com/advanced/websockets/
- Starlette WebSockets documentation: https://www.starlette.io/websockets/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry ASGI instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/asgi.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry trace API specification for SpanKind: https://opentelemetry.io/docs/specs/otel/trace/api
- OpenTelemetry network semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/

## Issues Found
- The post stated that FastAPI OpenTelemetry instrumentation only handles HTTP requests and that WebSocket endpoints require manual instrumentation. OpenTelemetry's ASGI middleware handles both `http` and `websocket` scopes and can create low-level WebSocket send/receive spans, so the wording was corrected to explain that manual instrumentation is still needed for useful business-level connection and message details.
- The first WebSocket example initialized `message_count` after `websocket.accept()`. If accepting the connection failed, the `finally` block could reference `message_count` before assignment. The counter is now initialized before the `try` block.
- The example used the deprecated `net.transport` semantic attribute with value `ip_tcp`. It was updated to `network.transport` with value `tcp`, matching current OpenTelemetry network semantic conventions.
- The per-message child span was explicitly marked `SpanKind.SERVER`. OpenTelemetry defines server spans for externally initiated requests; the message handling span is an internal child operation in this example, so the explicit kind was removed and it now uses the default internal span kind.
- The async `process_message` function used `time.sleep(0.1)`, which blocks the event loop. It now imports `asyncio` and uses `await asyncio.sleep(0.1)`.

## Review Notes
The examples are suitable tutorial snippets, but production systems should also consider graceful exporter/provider shutdown, multi-process connection tracking, handling failed broadcast sends returned by `asyncio.gather(..., return_exceptions=True)`, and avoiding high-cardinality attributes such as raw client IDs where backend cost or cardinality limits are a concern.
