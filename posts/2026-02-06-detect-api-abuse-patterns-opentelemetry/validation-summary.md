# Validation Summary: How to Detect API Abuse Patterns with OpenTelemetry Rate Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- OpenTelemetry semantic conventions
- FastAPI/Starlette middleware
- API abuse detection patterns

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- Starlette request state documentation: https://starlette.dev/requests/

## Issues Found
- The standalone detector snippets referenced `tracer`, metric instruments, and `defaultdict` without importing them. Added imports from the metrics module and Python standard library so the snippets are internally coherent.
- The credential-stuffing detector claimed to use consistent response times as a signal but did not track response times. Added response-time tracking and a simple variance check to match the stated indicator.
- The scraping detector called `_is_bot_user_agent()` without defining it. Added a small helper for common automated-client identifiers.
- The enumeration detector called `_get_ip_endpoint_stats()` without defining it and never updated the counters used for detection. Added an in-memory per-IP/per-endpoint stats map and updated it on each request.
- The enumeration snippet used the older `http.status_code` attribute name. Updated it to the stable HTTP semantic convention attribute `http.response.status_code`.
- The response data metric used `unit="bytes"`. Updated it to `unit="By"`, the OpenTelemetry conventional unit for bytes.
- The middleware used `request.state.get(...)`, but FastAPI/Starlette request state exposes attributes rather than dict-style `get()`. Replaced it with `getattr(...)` and added the missing FastAPI and detector imports.
- The request-per-IP counter was defined but never recorded. Added a counter increment in the middleware.
- The middleware claimed to tie all detectors together but did not invoke enumeration detection. Added an enumeration detector call using FastAPI path parameters.
- The middleware passed a constant `0` for response time even though response timing was used as a credential-stuffing signal. Added elapsed-time measurement around `call_next`.

## Review Notes
The examples remain intentionally simplified and use in-memory state, which is appropriate for illustrating detection logic but not sufficient for multi-process or distributed production deployments without shared storage or backend-side aggregation. The post also uses high-cardinality attributes such as source IP and endpoint; that can be useful for security analytics, but readers should evaluate backend cost and cardinality limits before deploying these exact metric dimensions.
