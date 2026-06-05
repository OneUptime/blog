# Validation Summary: How to Instrument Python Asyncio Coroutines with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- contextvars
- OpenTelemetry Python API and SDK
- OpenTelemetry context propagation
- OpenTelemetry trace semantic conventions
- aiohttp

## Sources Consulted
- Python `contextvars` documentation: https://docs.python.org/3/library/contextvars.html
- Python `asyncio` coroutines and tasks documentation: https://docs.python.org/3/library/asyncio-task.html
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/context.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The installation command included `asyncio`. This is a Python standard-library module in modern Python, not an OpenTelemetry async-support dependency, so it was removed from the `pip install` command.
- The introduction said asyncio creates many execution contexts as coroutines yield control. This overstated how context works; Python `contextvars` are natively supported by asyncio, and task contexts are copied at task creation. The wording was corrected to describe coroutine switching and task-local context.
- The `background_operation` example said context must be explicitly preserved when using `create_task`. Python's `asyncio.create_task()` copies the current context when no explicit context is provided, so the comment was corrected.
- The HTTP example used older semantic convention attributes through `SpanAttributes.HTTP_METHOD`, `SpanAttributes.HTTP_URL`, and `SpanAttributes.HTTP_STATUS_CODE`. These were changed to the current stable HTTP semantic attribute names: `http.request.method`, `url.full`, and `http.response.status_code`.

## Review Notes
The examples are manually instrumented and remain valid as illustrative code. In production, users would often prefer OpenTelemetry's aiohttp client instrumentation for automatic HTTP client spans, but manual spans are still technically valid when custom control is needed.
