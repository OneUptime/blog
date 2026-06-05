# Validation Summary: How to Instrument aiohttp Client and Server with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry aiohttp client instrumentation
- OpenTelemetry aiohttp server instrumentation
- aiohttp client and server
- Python asyncio
- OTLP trace export
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry aiohttp client instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/aiohttp_client/aiohttp_client.html
- OpenTelemetry aiohttp client instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/aiohttp_client.html
- OpenTelemetry aiohttp server instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/aiohttp_server/aiohttp_server.html
- OpenTelemetry aiohttp server instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/aiohttp_server.html
- aiohttp documentation: https://docs.aiohttp.org/en/

## Issues Found
- The server example included a client POST request to `/users`, but the server example did not define a matching route. Added a `create_user_handler` and `app.router.add_post('/users', create_user_handler)` so the client example receives the expected JSON response instead of a 404.
- The concurrent client request example passed raw `session.get()` context manager objects into `asyncio.gather()` and did not consume or close the responses. Added a `fetch_url()` helper that uses `async with`, reads the response body, and returns the status code so connections are released correctly.
- The aiohttp client hook example treated `params` as a dictionary. The official instrumentation passes aiohttp trace parameter objects such as `TraceRequestStartParams`, `TraceRequestEndParams`, or `TraceRequestExceptionParams`. Updated the example to use `params.url` and `getattr(params, "response", None)`.
- The custom span attributes section said client instrumentation could filter requests through hooks. The official client filtering mechanism is the excluded URL environment variable, while hooks customize spans. Updated the wording to describe attribute customization and URL normalization.
- The server-side filtering example used unsupported `server_request_hook` and `should_trace` APIs. Current aiohttp server instrumentation supports excluded URL regexes through `OTEL_PYTHON_AIOHTTP_SERVER_EXCLUDED_URLS`; custom server attributes can be added with regular aiohttp middleware. Replaced the snippet with the supported environment-variable filtering approach plus aiohttp middleware for attributes.

## Review Notes
The OpenTelemetry Python aiohttp instrumentation packages are currently beta-versioned packages, and the documentation notes that HTTP header capture environment variable names are experimental and may change. The corrected examples parse successfully with Python's AST parser.
