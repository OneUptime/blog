# Validation Summary: How to Instrument Tornado Web Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Tornado
- Tornado WebSocketHandler
- OpenTelemetry Python API and SDK
- OpenTelemetry Tornado instrumentation
- OpenTelemetry OTLP exporter
- aiohttp client instrumentation

## Sources Consulted
- OpenTelemetry Tornado Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/tornado/tornado.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Tornado RequestHandler and Application documentation: https://www.tornadoweb.org/en/stable/web.html
- Tornado WebSocketHandler documentation: https://www.tornadoweb.org/en/stable/websocket.html

## Issues Found
- The main application example used `tornado.escape.json_decode()` without importing `tornado.escape`. Added the missing import so the example resolves the module explicitly.
- The `/users` route mapped to `UserHandler`, whose `get()` method required a `user_id` route argument. Made `user_id` optional and return a clear 400 response when a GET request reaches `/users` without an ID.
- The advanced hooks example used `client_request_hook` and `client_response_hook` as if they applied to inbound Tornado server requests. Updated it to use `server_request_hook` for inbound requests and added the documented `OTEL_PYTHON_TORNADO_EXCLUDED_URLS` environment variable for request filtering.
- The middleware example used a generic callable middleware pattern that is not how Tornado applications wrap request handlers. Replaced it with a reusable `RequestHandler` base class using Tornado's documented `prepare()` hook.

## Review Notes
The Python snippets were checked for syntax after the edits. The local environment did not have Tornado or OpenTelemetry installed, so runtime verification was limited to syntax checks and official documentation review.
