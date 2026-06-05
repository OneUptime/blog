# Validation Summary: How to Instrument FastAPI with OpenTelemetry FastAPIInstrumentor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- Starlette / ASGI
- OpenTelemetry Python API and SDK
- OpenTelemetry FastAPI instrumentation
- OpenTelemetry ASGI instrumentation
- OpenTelemetry HTTPX instrumentation
- OpenTelemetry OTLP exporters
- Uvicorn

## Sources Consulted
- OpenTelemetry FastAPI Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry FastAPI instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/fastapi.html
- OpenTelemetry HTTPX Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- FastAPI Background Tasks documentation: https://fastapi.tiangolo.com/tutorial/background-tasks/

## Issues Found
- The post described FastAPI span names as `HTTP {method} {route}`. Current FastAPI instrumentation uses `{method} {route}` for HTTP requests, so the example was changed to `GET /api/users/{user_id}`.
- The hook example used incorrect signatures for `client_request_hook` and `client_response_hook`. Current OpenTelemetry FastAPI instrumentation passes `(span, scope, message)` for both hooks, so the function signatures and comments were corrected.
- The hook example described client hooks as outgoing HTTP request hooks. In FastAPI instrumentation these are ASGI receive/send hooks, not outbound HTTP client hooks, so the wording and example attributes were corrected.
- The HTTPX example claimed `httpx` automatically propagates trace context. That requires OpenTelemetry HTTPX instrumentation, so the install command, import, instrumentation call, and comment were added.
- The dependency example returned `({"error": "Unauthorized"}, 401)`, which FastAPI would serialize as response data rather than setting an HTTP status code. It now raises `HTTPException(status_code=401, detail="Unauthorized")`.
- The setup text claimed FastAPI instrumentation provides route parameter extraction and dependency injection awareness. The supported behavior is route template extraction and FastAPI/Starlette request handling integration, so the wording was narrowed.
- The background task section claimed background spans are separate and not children of the HTTP request span. Current OpenTelemetry FastAPI instrumentation wraps Starlette background tasks in `BackgroundTask ...` spans, so the section was updated to describe that behavior and remove an unused `set_span_in_context` import.

## Review Notes
- Python fenced code blocks were parsed with `ast.parse` after the edits and passed syntax checks.
- Local execution of FastAPI/OpenTelemetry examples was not performed against the system environment because the required packages were not installed globally; package APIs were checked against official docs and a temporary `/tmp` package target installation for signature/source inspection.
