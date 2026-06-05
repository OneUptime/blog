# Validation Summary: How to Configure W3C Baggage Propagation in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API and SDK
- W3C Baggage
- W3C Trace Context
- Context propagation
- Flask middleware

## Sources Consulted
- W3C Baggage Candidate Recommendation: https://www.w3.org/TR/baggage/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/

## Issues Found
- The post used the older W3C Baggage limit language that described an 8192-byte total header limit and a 4096-byte per-entry cap. The current W3C specification requires propagation when the resulting baggage string has 64 entries or fewer and is 8192 bytes or less, and allows platforms to drop entries when those limits are exceeded. Updated both limit references.
- The default propagator statement was broader than the verified Python-specific documentation. Narrowed it to OpenTelemetry Python, whose default is equivalent to `OTEL_PROPAGATORS="tracecontext,baggage"`.
- The Python import path for `TraceContextTextMapPropagator` did not match the documented current OpenTelemetry Python path. Changed it to `opentelemetry.trace.propagation.tracecontext`.
- The baggage setting example said `baggage.set_baggage()` returns a context token. It returns a new context; `context.attach()` returns the token. Updated the comment.
- The header injection example claimed `traceparent` would be emitted, but no current span was active in that snippet. Added a tracer and wrapped injection in `start_as_current_span()` so the described output is accurate.
- The Flask middleware example passed `dict(request.headers)` directly to `extract()`. Flask/Werkzeug header keys are commonly title-cased, while OpenTelemetry's default dictionary carrier lookup expects the lowercase `baggage` key. Updated the example to lowercase header keys before extraction.

## Review Notes
The examples are intentionally minimal and assume the required OpenTelemetry packages are installed. In production Flask or FastAPI applications, official OpenTelemetry instrumentation is usually preferable to hand-written propagation middleware.
