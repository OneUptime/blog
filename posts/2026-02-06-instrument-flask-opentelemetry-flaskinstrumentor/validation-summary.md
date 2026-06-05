# Validation Summary: How to Instrument Flask Applications with OpenTelemetry FlaskInstrumentor

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry Flask instrumentation
- OpenTelemetry OTLP gRPC exporter
- Flask
- Python

## Sources Consulted
- OpenTelemetry Flask Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Flask instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/flask.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The span naming description incorrectly said spans follow `HTTP {method} {route}`. The OpenTelemetry Flask instrumentation uses the HTTP method and Flask route rule, for example `GET /api/users`, so the wording was corrected.
- The request/response hook example called `request_hook` and `response_hook` before those functions were defined. The function definitions were moved before the `instrument_app()` call so the snippet works when executed top-to-bottom.
- The post stated that FlaskInstrumentor could be configured to capture query parameters and request/response bodies. The official Flask instrumentation documents header capture and hooks for custom attributes, not automatic body capture, so the wording was narrowed.
- The application factory section implied instrumentation must happen after blueprint registration for routes to be instrumented. Official examples instrument before route declaration, and the instrumentor wraps request handling globally, so the wording was changed to say instrumentation should happen during application setup before serving requests.
- The error-handling example said a caught `ValueError` span is automatically marked as an error. Because the exception is handled and a 400 response is a server span, it is better to add context explicitly; the comment was corrected.

## Review Notes
The examples use current OpenTelemetry Python APIs, including `FlaskInstrumentor().instrument_app()`, `BatchSpanProcessor`, `OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)`, and manual nested spans with `start_as_current_span()`. The verification attributes in the post use the older default HTTP semantic convention names; OpenTelemetry also supports newer stable HTTP semantic conventions via `OTEL_SEMCONV_STABILITY_OPT_IN`.
