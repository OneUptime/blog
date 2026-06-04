# Validation Summary: How to use OpenTelemetry baggage for cross-cutting concerns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Baggage
- OpenTelemetry Python API
- OpenTelemetry Flask instrumentation
- OpenTelemetry Requests instrumentation
- W3C Baggage propagation
- W3C Trace Context
- Python
- Flask
- Requests

## Sources Consulted
- OpenTelemetry Baggage concepts: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python baggage API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- W3C Baggage specification: https://www.w3.org/TR/baggage/

## Issues Found
- The post said span attributes stay within a single service. Changed this to say span attributes are not propagated automatically, which is the relevant distinction from baggage.
- The post described trace context as containing only trace and span IDs. Changed this to W3C Trace Context carrying identifiers and trace metadata, because trace context also includes fields such as trace flags and tracestate.
- Added a sensitivity caveat to the baggage overview because OpenTelemetry documentation notes that baggage is propagated in network requests and can be sent to unintended downstream services.
- The multi-tenant, feature flag, and A/B testing snippets claimed automatic propagation but did not configure Flask and Requests instrumentation. Added `FlaskInstrumentor().instrument_app(...)` and `RequestsInstrumentor().instrument()` where needed.
- The multi-tenant example attached baggage context in `before_request` without detaching it. Added a `teardown_request` handler to detach the token for the request.
- The best-practices example incorrectly said OpenTelemetry Python does not have a `get_all` method. Replaced the workaround with `dict(baggage.get_all())`, matching the current OpenTelemetry Python baggage API.
- The size-check helper reported bytes while checking Python character length. Updated it to check UTF-8 byte length before truncating.

## Review Notes
- The code snippets are illustrative and assume the relevant OpenTelemetry instrumentation packages are installed and configured in the runtime environment.
- The W3C baggage size limit applies to the propagated baggage header as a whole; the helper in the post remains a conservative per-value guard rather than a complete header-size enforcement implementation.
