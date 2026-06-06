# Validation Summary: How to Create Custom Span Processors for Attribute Enrichment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry tracing
- Span processors
- Span exporters
- OTLP trace export
- Flask request middleware
- Python unit testing

## Sources Consulted
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The deployment enrichment example used `deployment.environment`, `deployment.version`, and `deployment.region`. `deployment.environment` has been renamed to `deployment.environment.name`, and `service.version` and `cloud.region` are the current semantic convention names for service version and cloud region. Updated the code and tests to use those names.
- The filtering section implied a span processor could suppress health check spans or mark them as non-recording. The OpenTelemetry Trace SDK specification says `on_end` receives a readable ended span and modifying it is not allowed. Updated the explanation and docstring to clarify that actual dropping should happen through a sampler, exporter wrapper, or Collector pipeline.
- The filtering example checked `http.target`, which is part of the older HTTP semantic conventions. Updated it to check `url.path`, which aligns with the stable HTTP semantic conventions.

## Review Notes
- Static deployment metadata is often better represented as OpenTelemetry resource attributes on the `TracerProvider` rather than repeated span attributes. The post remains valid because it is specifically demonstrating custom span processor enrichment, but a future revision could add that distinction.
- The thread-local request context example is appropriate for the Flask middleware shown. Async frameworks such as FastAPI usually need context variables or OpenTelemetry baggage rather than plain `threading.local()`.
