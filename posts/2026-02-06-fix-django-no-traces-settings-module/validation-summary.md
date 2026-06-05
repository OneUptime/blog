# Validation Summary: How to Fix Django Instrumentation Producing No Traces Because

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry Django instrumentation
- Django settings configuration
- Python WSGI and ASGI setup
- Gunicorn
- Docker

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python operator auto-instrumentation for Django applications: https://opentelemetry.io/docs/zero-code/python/operator/
- OpenTelemetry Django instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry Django instrumentor module documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/django.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry standard output span exporter specification: https://opentelemetry.io/docs/specs/otel/trace/sdk_exporters/stdout/
- OpenTelemetry SDK environment variables specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Django settings documentation: https://docs.djangoproject.com/en/4.2/topics/settings/

## Issues Found
- The explanation said Django internals are not initialized and instrumentation simply fails silently. The current OpenTelemetry Django instrumentor catches missing `DJANGO_SETTINGS_MODULE`, logs at debug level, and may configure empty settings instead. Updated the wording to describe that behavior accurately.
- The Gunicorn config example called `DjangoInstrumentor().instrument()` directly without configuring a tracer provider or exporter. Updated it to import the post's existing `myproject.tracing` module, which performs the SDK/exporter setup and instrumentation.
- The console exporter example showed a timeline-style trace display. OpenTelemetry Python's console exporter writes span objects to stdout, and the exact format is not standardized. Replaced the example with a representative exported span object.

## Review Notes
The main recommendation is correct: for Django auto-instrumentation, set `DJANGO_SETTINGS_MODULE` before `opentelemetry-instrument` or `DjangoInstrumentor().instrument()` runs. The console exporter remains appropriate for local debugging, but its output format can change between implementations or versions.
