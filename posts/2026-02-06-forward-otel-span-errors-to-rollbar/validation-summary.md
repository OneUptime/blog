# Validation Summary: How to Forward OpenTelemetry Span Error Events to Rollbar

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry span events and exception semantic conventions
- OpenTelemetry SpanProcessor
- Rollbar Create Item API
- Python requests

## Sources Consulted
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- Rollbar Create Item API documentation: https://docs.rollbar.com/reference/create-item

## Issues Found
- The approach section used the camelCase `span.recordException(error)` method name, but the Python API uses `span.record_exception(error)`. Updated the text to match the Python examples and official Python API.
- The Rollbar payload placed the access token in a top-level `access_token` field. Rollbar's current Create Item API documents `X-Rollbar-Access-Token` as a required header. Updated the `requests.post()` call to send the token in that header and removed the top-level token field.
- The custom `force_flush()` method returned `None`, but OpenTelemetry Python documents `SpanProcessor.force_flush()` as returning a boolean. Updated it to return `True` for the synchronous processor.
- The batched processor example inherited directly from `SpanProcessor` while calling `_send_to_rollbar()`, which was not defined in that class. Updated it to inherit from `RollbarSpanProcessor` and call `super().__init__()`.
- The batched processor did not implement `force_flush()`. Added future tracking and a `force_flush()` implementation that waits for submitted Rollbar sends within the requested timeout.
- Removed an unused `json` import from the first snippet.

## Review Notes
The corrected code snippets parse successfully as Python. The snippets still assume that `requests`, `opentelemetry-sdk`, and the OTLP gRPC exporter package are installed, and the application example intentionally leaves domain functions such as `validate_order()` undefined.
