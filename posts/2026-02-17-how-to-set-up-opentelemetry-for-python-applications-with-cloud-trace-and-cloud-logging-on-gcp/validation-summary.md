# Validation Summary: How to Set Up OpenTelemetry for Python Applications with Cloud Trace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Cloud Trace
- Cloud Logging
- OpenTelemetry Python
- Flask
- Requests
- SQLAlchemy instrumentation
- Redis instrumentation
- gRPC instrumentation
- Celery instrumentation
- Cloud Run
- Gunicorn

## Sources Consulted
- Google Cloud Logging Python standard library integration: https://docs.cloud.google.com/python/docs/reference/logging/latest/std-lib-integration
- Google Cloud Logging automatic trace/span extraction: https://docs.cloud.google.com/python/docs/reference/logging/latest/auto-trace-span-extraction
- Google Cloud Trace log integration: https://docs.cloud.google.com/trace/docs/trace-log-integration
- Google Cloud Python OpenTelemetry tracing example: https://docs.cloud.google.com/python/docs/reference/spanner/latest/opentelemetry-tracing
- Google Cloud Trace instrumentation overview: https://cloud.google.com/trace/docs/setup/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- Google Cloud Logging Python API method summary: https://docs.cloud.google.com/python/docs/reference/logging/latest/summary_method

## Issues Found
- The Cloud Logging example used a custom `TraceContextFilter` that populated `record.trace_id`, but the Cloud Logging Python client documents `trace`, `span_id`, and `trace_sampled` as supported LogEntry metadata fields. I changed the setup to use `client.setup_logging(log_level=logging.INFO)`, which is the documented standard-library integration and automatically populates trace/span fields from the active OpenTelemetry span in supported versions.
- The auto-instrumentation example imported `CeleryInstrumentor`, but the dependency installation section did not install `opentelemetry-instrumentation-celery`. I added the missing package to the install commands.
- The Flask example imported `SQLAlchemyInstrumentor` but did not use it, while the deployment `requirements.txt` did not include the SQLAlchemy instrumentation package. I removed the unused import so the deployed sample does not fail on an unnecessary dependency.
- The span status examples used `trace.StatusCode.ERROR`. I updated them to import `Status` and `StatusCode` from `opentelemetry.trace` and call `span.set_status(Status(StatusCode.ERROR, ...))`, matching the current OpenTelemetry Python documentation.
- The deployment `requirements.txt` allowed any `google-cloud-logging` 3.x release, but OpenTelemetry trace/span integration was added in the 3.11 series. I changed the pin to `google-cloud-logging>=3.11,<4`.

## Review Notes
Google Cloud currently recommends OTLP/collector-based export where the environment supports it, while still documenting the Cloud Trace exporter as an option. The post remains technically valid because it is specifically demonstrating the Cloud Trace exporter path.
