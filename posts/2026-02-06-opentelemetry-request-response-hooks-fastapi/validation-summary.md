# Validation Summary: How to Use OpenTelemetry Request and Response Hooks in FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry FastAPI instrumentation
- OpenTelemetry ASGI instrumentation
- FastAPI
- Starlette middleware
- Python
- PyJWT
- ASGI HTTP scopes and messages

## Sources Consulted
- OpenTelemetry FastAPI Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry ASGI Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asgi/asgi.html
- OpenTelemetry HTTPX Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- ASGI HTTP and WebSocket message format specification: https://asgi.readthedocs.io/en/stable/specs/www.html

## Issues Found
- The post described FastAPI `client_request_hook` and `client_response_hook` as hooks for outgoing external HTTP calls. OpenTelemetry FastAPI instrumentation documents these as ASGI internal receive/send hooks that receive `(span, scope, message)`. Updated the lifecycle explanation, diagram, and code example to show ASGI receive/send events instead.
- The client hook example used incorrect callback signatures: `client_request_hook(span, scope)` and `client_response_hook(span, message)`. Updated both examples to use the documented three-argument signatures.
- The client hook example implied `httpx` calls would be instrumented by `FastAPIInstrumentor`. Updated the text to state that outgoing `httpx` calls should use `opentelemetry-instrumentation-httpx`.
- The performance-budget example called `trace.get_current_span()` without importing `trace`. Added `from opentelemetry import trace`.
- The performance-budget example stored request start times in a global dictionary but never used or cleaned them up. Removed the unused global state and updated the hook docstring.
- Removed unused imports from examples where they were no longer needed.

## Review Notes
All Python code blocks were checked with Python's `compile()` function and are syntactically valid. Some attribute names in the examples are custom or illustrative rather than strict OpenTelemetry semantic-convention attributes; that is acceptable for a custom-attribute tutorial, but future updates could mention when built-in header-capture configuration is preferable to manually copying headers in hooks.
