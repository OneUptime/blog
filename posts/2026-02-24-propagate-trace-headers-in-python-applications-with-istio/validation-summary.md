# Validation Summary: How to Propagate Trace Headers in Python Applications with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio distributed tracing
- Python
- Flask
- FastAPI
- Django
- requests
- httpx
- OpenTelemetry Python instrumentation
- W3C Trace Context and B3 propagation

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- FastAPI APIRouter reference noting `on_event` deprecation: https://fastapi.tiangolo.com/reference/apirouter/
- Python `contextvars` documentation: https://docs.python.org/3/library/contextvars.html
- Python issue tracker discussion for `run_in_executor` context propagation: https://bugs.python.org/issue34014
- HTTPX async client documentation: https://www.python-httpx.org/async/
- HTTPX event hooks documentation: https://www.python-httpx.org/advanced/event-hooks/
- Django request and response object documentation: https://docs.djangoproject.com/en/4.2/ref/request-response/
- Requests advanced usage documentation: https://requests.readthedocs.io/en/stable/user/advanced/
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python agent configuration documentation: https://opentelemetry.io/docs/zero-code/python/configuration/

## Issues Found
- The Flask section described the `g` example as thread-local storage and stated that Flask uses threads by default with Gunicorn sync workers. Updated the heading and explanation to describe Flask's request-local context, which matches Flask's official documentation and the actual code.
- The FastAPI reusable client example used `@app.on_event('shutdown')`, which is deprecated in current FastAPI. Replaced it with a lifespan handler that closes the persistent `httpx.AsyncClient`.
- The FastAPI middleware examples set `ContextVar` values without resetting them. Added token-based reset logic in `finally` blocks so per-request trace headers do not leak into later work in the same context.
- The decorator example called `asyncio.iscoroutinefunction()` without importing `asyncio`. Added the missing import.
- The decorator example also set a `ContextVar` without resetting it. Added token-based reset logic for both sync and async wrappers.
- The OpenTelemetry install command used B3 propagation but did not install `opentelemetry-propagator-b3`, which OpenTelemetry documents as required for B3 propagation support. Added the package to the install commands.
- The OpenTelemetry commands disabled trace export but left metrics export implicit. Added `--metrics_exporter none` so the command matches the stated intent of using instrumentation only for propagation in an Istio sidecar setup.
- The asyncio pitfall incorrectly said `ContextVar` values are automatically copied to `run_in_executor` worker threads. Corrected it to note that asyncio tasks preserve context, while `run_in_executor` requires explicit context copying or `asyncio.to_thread()`.
- The requests pitfall said the `requests` library uses connection pooling by default. Tightened the wording to say `requests.Session` uses urllib3 connection pooling, matching the requests documentation and the examples in the post.

## Review Notes
The post is technically relevant and salvageable. The trace header list and core Istio explanation match Istio's distributed tracing documentation. The manual propagation examples remain intentionally lightweight and do not replace full OpenTelemetry instrumentation for applications that also need application-level spans.
