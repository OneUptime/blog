# Validation Summary: How to Instrument HTTPX Async Client with OpenTelemetry in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- HTTPX
- HTTPX AsyncClient
- HTTP/2
- OpenTelemetry Python
- OpenTelemetry HTTPX instrumentation
- OTLP trace export
- asyncio

## Sources Consulted
- OpenTelemetry HTTPX Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- HTTPX main documentation and installation notes: https://www.python-httpx.org/
- HTTPX HTTP/2 documentation: https://www.python-httpx.org/http2/
- HTTPX timeout documentation: https://www.python-httpx.org/advanced/timeouts/
- HTTPX resource limits documentation: https://www.python-httpx.org/advanced/resource-limits/
- HTTPX exceptions documentation: https://www.python-httpx.org/exceptions/
- HTTPX API reference: https://www.python-httpx.org/api/

## Issues Found
- The installation command used `httpx`, but later examples enable `http2=True`. HTTPX documents HTTP/2 support as requiring the optional `httpx[http2]` dependencies, so the install command now uses `pip install "httpx[http2]"`.
- The feature list claimed built-in retry configuration. HTTPX documents built-in timeout configuration and transport-level retry options, but not a general client retry configuration, so the wording was narrowed to built-in timeout configuration.
- The OpenTelemetry HTTPX hook example used `httpx.Request` and `httpx.Response` objects and passed async hooks as `request_hook` and `response_hook`. The official instrumentation API uses `RequestInfo` and `ResponseInfo` transport-layer values for hooks and `async_request_hook` / `async_response_hook` for global async client instrumentation. The example was updated accordingly.
- The hook example accessed fields that do not exist on OpenTelemetry `RequestInfo` / `ResponseInfo`, such as `request.content`, `response.is_success`, and `response.is_error`. The code now uses the documented fields: decoded request method, URL, headers, and numeric response status code.
- Several URLs in the HTTP/2 concurrent request example returned 404. They were replaced with valid HTTP/2-capable `nghttp2.org/httpbin` endpoints.
- The error-handling example used `https://httpbin.org/status/200` as the success case and then called `response.json()`, but that endpoint returns an empty body. The success case now uses `https://httpbin.org/json`.

## Review Notes
All Python code fences were parsed with Python 3.12 after the corrections. The examples are intentionally tutorial snippets and assume normal network access plus a configured OpenTelemetry collector for the OTLP example.
