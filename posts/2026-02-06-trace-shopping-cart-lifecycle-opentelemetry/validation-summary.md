# Validation Summary: How to Trace a Complete Shopping Cart Lifecycle with OpenTelemetry Custom Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry custom spans
- OTLP gRPC trace exporting
- W3C trace context propagation
- Python datetime handling
- E-commerce shopping cart tracing patterns

## Sources Consulted
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python `opentelemetry.propagate` API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python tracing API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post used `trace.propagation.extract()` and `trace.propagation.inject()`, which are not the OpenTelemetry Python propagation API. Updated the setup snippet to import `extract` and `inject` from `opentelemetry.propagate`, and updated the session helper to call those functions.
- The post set span status with `trace.StatusCode.ERROR`. Updated the example to import `Status` and `StatusCode` from `opentelemetry.trace` and call `span.set_status(Status(StatusCode.ERROR, "Product out of stock"))`, matching the current Python instrumentation docs.
- The post used `datetime.utcnow()`, which is deprecated in Python 3.12 and returns naive UTC datetimes. Updated the examples to use `datetime.now(timezone.utc)` and added the needed `datetime`, `timedelta`, and `timezone` imports.
- The cart session helper returned a raw carrier dictionary for new sessions but a `Context` for existing sessions, and the operation spans did not use the returned context. Updated the helper to consistently return an extracted OpenTelemetry context and wired that context into the top-level add, update, and remove spans.
- The text described a "long-lived span" even though the example creates and closes a scoped span. Reworded it to describe a cart session trace context instead.

## Review Notes
The Python snippets parse successfully after the changes. A smoke test against current OpenTelemetry Python packages verified the corrected imports, `Status` usage, propagation calls, `start_as_current_span(..., context=...)`, and list-valued attributes. Export connectivity to `localhost:4317` was not validated because no local OTLP collector was running.
